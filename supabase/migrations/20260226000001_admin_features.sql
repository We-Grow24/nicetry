-- Migration: admin features — roles, library, templates, support, transactions, feature_flags
-- Run this in Supabase → SQL Editor
-- Self-contained: creates prerequisites if they don't exist yet.

-- ──────────────────────────────────────────────────────────────────────────────
-- 0. Prerequisites — create tables from earlier migrations if not yet present
-- ──────────────────────────────────────────────────────────────────────────────

-- updated_at helper (idempotent)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- pipeline_runs (needed for admin policies)
create table if not exists public.pipeline_runs (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  zone_type    text        not null,
  prompt       text,
  answers      jsonb,
  master_seed  jsonb,
  status       text        not null default 'pending',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- user_profiles (may already exist — IF NOT EXISTS is safe)
create table if not exists public.user_profiles (
  id           uuid        primary key references auth.users(id) on delete cascade,
  credits      integer     not null default 100 check (credits >= 0),
  total_spent  integer     not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- RLS on user_profiles (in case this is the first migration run)
alter table public.user_profiles enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='user_profiles'
      and policyname='Users can read own profile'
  ) then
    create policy "Users can read own profile"
      on public.user_profiles for select
      using (auth.uid() = id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='user_profiles'
      and policyname='Users can update own profile'
  ) then
    create policy "Users can update own profile"
      on public.user_profiles for update
      using (auth.uid() = id);
  end if;
end $$;

-- wisdom_rules (needed for trigger_count column + admin policies)
create table if not exists public.wisdom_rules (
  id          uuid        primary key default gen_random_uuid(),
  zone_type   text        not null,
  rule_key    text        not null,
  label       text        not null,
  description text,
  enabled     boolean     not null default true,
  severity    text        not null default 'error'
              check (severity in ('error', 'warning')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (zone_type, rule_key)
);

alter table public.wisdom_rules enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='wisdom_rules'
      and policyname='Authenticated users can read rules'
  ) then
    create policy "Authenticated users can read rules"
      on public.wisdom_rules for select
      using (auth.role() = 'authenticated');
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Add role column to user_profiles
-- ──────────────────────────────────────────────────────────────────────────────
alter table public.user_profiles
  add column if not exists role text not null default 'creator'
  check (role in ('creator', 'moderator', 'admin'));

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. library_blocks
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.library_blocks (
  id               uuid        primary key default gen_random_uuid(),
  type             text        not null,
  niche            text,
  name             text        not null,
  tags             text[]      not null default '{}',
  seed_json        jsonb       not null default '{}',
  usage_count      integer     not null default 0,
  is_quarantine    boolean     not null default false,
  is_approved      boolean     not null default true,
  fusion_description text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

drop trigger if exists library_blocks_updated_at on public.library_blocks;
create trigger library_blocks_updated_at
  before update on public.library_blocks
  for each row execute procedure public.set_updated_at();

alter table public.library_blocks enable row level security;

create policy "Authenticated can read library"
  on public.library_blocks for select
  using (auth.role() = 'authenticated');

create policy "Service role manages library"
  on public.library_blocks for all
  using (auth.role() = 'service_role');

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. templates
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.templates (
  id               uuid        primary key default gen_random_uuid(),
  name             text        not null,
  zone_type        text        not null check (zone_type in ('game','website','video','anime','saas')),
  price_credits    integer     not null default 0,
  seed_json        jsonb       not null default '{}',
  is_available     boolean     not null default true,
  sold_count       integer     not null default 0,
  preview_url      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

drop trigger if exists templates_updated_at on public.templates;
create trigger templates_updated_at
  before update on public.templates
  for each row execute procedure public.set_updated_at();

alter table public.templates enable row level security;

create policy "Authenticated can read available templates"
  on public.templates for select
  using (auth.role() = 'authenticated' and is_available = true);

create policy "Service role manages templates"
  on public.templates for all
  using (auth.role() = 'service_role');

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. transactions
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.transactions (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  amount_inr       numeric     not null,
  credits_added    integer     not null default 0,
  razorpay_order_id text,
  razorpay_payment_id text,
  status           text        not null default 'pending'
                   check (status in ('pending','completed','failed')),
  created_at       timestamptz not null default now()
);

create index if not exists transactions_user_id_idx on public.transactions (user_id);
create index if not exists transactions_status_idx on public.transactions (status);

alter table public.transactions enable row level security;

create policy "Users can read own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Service role manages transactions"
  on public.transactions for all
  using (auth.role() = 'service_role');

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. support_tickets
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.support_tickets (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  subject          text        not null,
  body             text        not null,
  status           text        not null default 'open'
                   check (status in ('open','in_progress','closed')),
  admin_reply      text,
  replied_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists support_tickets_user_id_idx on public.support_tickets (user_id);
create index if not exists support_tickets_status_idx on public.support_tickets (status);

drop trigger if exists support_tickets_updated_at on public.support_tickets;
create trigger support_tickets_updated_at
  before update on public.support_tickets
  for each row execute procedure public.set_updated_at();

alter table public.support_tickets enable row level security;

create policy "Users can read own tickets"
  on public.support_tickets for select
  using (auth.uid() = user_id);

create policy "Users can insert own tickets"
  on public.support_tickets for insert
  with check (auth.uid() = user_id);

create policy "Service role manages tickets"
  on public.support_tickets for all
  using (auth.role() = 'service_role');

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. feature_flags
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.feature_flags (
  id               uuid        primary key default gen_random_uuid(),
  key              text        not null unique,
  label            text        not null,
  description      text,
  enabled          boolean     not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

drop trigger if exists feature_flags_updated_at on public.feature_flags;
create trigger feature_flags_updated_at
  before update on public.feature_flags
  for each row execute procedure public.set_updated_at();

alter table public.feature_flags enable row level security;

create policy "Authenticated can read flags"
  on public.feature_flags for select
  using (auth.role() = 'authenticated');

create policy "Service role manages flags"
  on public.feature_flags for all
  using (auth.role() = 'service_role');

-- Seed some initial flags
insert into public.feature_flags (key, label, description, enabled)
values
  ('new_builder_ui',        'New Builder UI',         'Enables the revamped drag-drop builder',       false),
  ('anime_studio_v2',       'Anime Studio v2',        'Second-gen anime generation pipeline',         false),
  ('saas_auto_deploy',      'SaaS Auto-Deploy',       'One-click deploy for SaaS projects',           false),
  ('credits_referral',      'Referral Credits',       'Earn credits by referring new users',          false),
  ('wisdom_auto_fix',       'Wisdom Auto-Fix',        'Wisdom agent suggests automatic fixes',        true)
on conflict (key) do nothing;

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. announcement: add trigger count to wisdom_rules
-- ──────────────────────────────────────────────────────────────────────────────
alter table public.wisdom_rules
  add column if not exists trigger_count integer not null default 0;

-- ──────────────────────────────────────────────────────────────────────────────
-- 8. RLS admin helper function
--    Usage: call is_admin() in RLS policies to give admins full access
-- ──────────────────────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Admin override policies
create policy "Admins can read all pipeline_runs"
  on public.pipeline_runs for select
  using (public.is_admin());

create policy "Admins can manage library_blocks"
  on public.library_blocks for all
  using (public.is_admin());

create policy "Admins can manage templates"
  on public.templates for all
  using (public.is_admin());

create policy "Admins can read all transactions"
  on public.transactions for select
  using (public.is_admin());

create policy "Admins can manage support_tickets"
  on public.support_tickets for all
  using (public.is_admin());

create policy "Admins can manage wisdom_rules"
  on public.wisdom_rules for all
  using (public.is_admin());

create policy "Admins can manage feature_flags"
  on public.feature_flags for all
  using (public.is_admin());

create policy "Admins can manage user_profiles"
  on public.user_profiles for all
  using (public.is_admin());
