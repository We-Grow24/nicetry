-- Migration: create pipeline_runs table
-- Run this in Supabase → SQL Editor

create table if not exists public.pipeline_runs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  zone_type    text not null check (zone_type in ('game', 'website', 'video')),
  prompt       text,
  answers      jsonb,
  master_seed  jsonb,
  status       text not null default 'pending'
               check (status in (
                 'pending',
                 'architect_done',
                 'wisdom_done',
                 'failed'
               )),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Index for per-user lookups
create index if not exists pipeline_runs_user_id_idx
  on public.pipeline_runs (user_id);

-- updated_at auto-trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger pipeline_runs_updated_at
  before update on public.pipeline_runs
  for each row execute procedure public.set_updated_at();

-- RLS
alter table public.pipeline_runs enable row level security;

create policy "Users can read own runs"
  on public.pipeline_runs for select
  using (auth.uid() = user_id);

create policy "Users can insert own runs"
  on public.pipeline_runs for insert
  with check (auth.uid() = user_id);

create policy "Service role can do anything"
  on public.pipeline_runs for all
  using (auth.role() = 'service_role');
