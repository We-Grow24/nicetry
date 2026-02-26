-- Migration: projects table + user_profiles (credits) + pipeline_runs "completed" status
-- Run this in Supabase → SQL Editor

-- ─── 1. Extend pipeline_runs status to include "completed" ───────────────────
alter table public.pipeline_runs
  drop constraint if exists pipeline_runs_status_check;

alter table public.pipeline_runs
  add constraint pipeline_runs_status_check
  check (status in (
    'pending',
    'architect_done',
    'wisdom_approved',
    'wisdom_rejected',
    'wisdom_done',    -- back-compat
    'director_done',  -- back-compat
    'completed',
    'failed'
  ));

-- ─── 2. user_profiles ────────────────────────────────────────────────────────
-- Stores per-user app data. A row is auto-created via trigger on auth.users
-- INSERT. credits is the primary balance column consumed by the pipeline.

create table if not exists public.user_profiles (
  id             uuid        primary key references auth.users(id) on delete cascade,
  credits        integer     not null default 100 check (credits >= 0),
  total_spent    integer     not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

drop trigger if exists user_profiles_updated_at on public.user_profiles;
create trigger user_profiles_updated_at
  before update on public.user_profiles
  for each row execute procedure public.set_updated_at();

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS
alter table public.user_profiles enable row level security;

create policy "Users can read own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

create policy "Service role can manage profiles"
  on public.user_profiles for all
  using (auth.role() = 'service_role');

-- ─── 3. projects ─────────────────────────────────────────────────────────────
-- The canonical "created project" row. Written by director-agent after the
-- master_seed passes wisdom validation.

drop table if exists public.projects cascade;

create table public.projects (
  id                   uuid        primary key default gen_random_uuid(),
  user_id              uuid        not null references auth.users(id) on delete cascade,
  type                 text        not null
                       check (type in ('game', 'website', 'video', 'anime', 'saas')),
  master_director_seed jsonb,
  pipeline_run_id      uuid        references public.pipeline_runs(id) on delete set null,
  status               text        not null default 'active'
                       check (status in ('active', 'archived', 'deleted')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists projects_user_id_idx
  on public.projects (user_id);

create index if not exists projects_pipeline_run_id_idx
  on public.projects (pipeline_run_id);

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at
  before update on public.projects
  for each row execute procedure public.set_updated_at();

-- RLS
alter table public.projects enable row level security;

create policy "Users can read own projects"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = user_id);

create policy "Service role can manage projects"
  on public.projects for all
  using (auth.role() = 'service_role');

-- ─── 4. deduct_credits RPC ───────────────────────────────────────────────────
-- Atomically deducts credits and increments total_spent.
-- Returns:
--   ok        true if deduction succeeded, false if insufficient credits
--   remaining credits balance after deduction attempt
-- Called by director-agent via service-role client.

drop function if exists public.deduct_credits(uuid, integer);

create function public.deduct_credits(
  p_user_id uuid,
  p_amount  integer
)
returns jsonb
language plpgsql security definer as $$
declare
  v_current integer;
begin
  -- Upsert profile so missing rows don't block the pipeline
  insert into public.user_profiles (id)
  values (p_user_id)
  on conflict (id) do nothing;

  select credits into v_current
  from public.user_profiles
  where id = p_user_id
  for update;   -- row-level lock prevents double-spend

  if v_current < p_amount then
    return jsonb_build_object(
      'ok', false,
      'remaining', v_current,
      'required', p_amount
    );
  end if;

  update public.user_profiles
  set
    credits     = credits     - p_amount,
    total_spent = total_spent + p_amount
  where id = p_user_id;

  return jsonb_build_object(
    'ok', true,
    'remaining', v_current - p_amount,
    'deducted', p_amount
  );
end;
$$;

-- Grant execute to service role only (edge functions use service role key)
revoke all on function public.deduct_credits(uuid, integer) from public;
grant execute on function public.deduct_credits(uuid, integer) to service_role;
