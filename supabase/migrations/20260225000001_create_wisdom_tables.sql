-- Migration: wisdom_rules, wisdom_rules_log + pipeline_runs status update
-- Run this in Supabase → SQL Editor

-- ─── 1. Extend pipeline_runs status constraint ────────────────────────────────
alter table public.pipeline_runs
  drop constraint if exists pipeline_runs_status_check;

alter table public.pipeline_runs
  add constraint pipeline_runs_status_check
  check (status in (
    'pending',
    'architect_done',
    'wisdom_approved',
    'wisdom_rejected',
    'wisdom_done',   -- kept for back-compat
    'director_done',
    'failed'
  ));

-- Extend zone_type constraint to cover anime + saas
alter table public.pipeline_runs
  drop constraint if exists pipeline_runs_zone_type_check;

alter table public.pipeline_runs
  add constraint pipeline_runs_zone_type_check
  check (zone_type in ('game', 'website', 'video', 'anime', 'saas'));

-- ─── 2. wisdom_rules ─────────────────────────────────────────────────────────
-- Stores per-zone rule metadata. Hardcoded-equivalent rules live here so they
-- can be toggled or extended without a code deploy.

drop table if exists public.wisdom_rules cascade;

create table public.wisdom_rules (
  id          uuid        primary key default gen_random_uuid(),
  zone_type   text        not null,
  rule_key    text        not null,
  label       text        not null,
  description text,
  enabled     boolean     not null default true,
  severity    text        not null default 'error'   -- 'error' | 'warning'
              check (severity in ('error', 'warning')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (zone_type, rule_key)
);

drop trigger if exists wisdom_rules_updated_at on public.wisdom_rules;
create trigger wisdom_rules_updated_at
  before update on public.wisdom_rules
  for each row execute procedure public.set_updated_at();

-- Seed default hardcoded rules (upsert-safe)
insert into public.wisdom_rules (zone_type, rule_key, label, description, severity)
values
  -- Game rules
  ('game', 'min_one_character',     'At least 1 character',     'master_seed.characters must have ≥1 entry',                   'error'),
  ('game', 'no_dead_end_missions',  'No dead-end missions',     'Every mission must have reward_credits > 0 or a continuation', 'error'),
  ('game', 'economy_balanced',      'Economy balanced',         'starting_credits and credit_earn_rate must both be defined',   'error'),
  -- Website rules
  ('website', 'has_navbar',         'Navbar present',           'A section or track identified as navbar must exist',           'error'),
  ('website', 'has_hero',           'Hero section present',     'A section or track identified as hero must exist',             'error'),
  ('website', 'has_footer',         'Footer present',           'A section or track identified as footer must exist',           'error'),
  ('website', 'mobile_responsive',  'Mobile responsive flag',   'metadata.mobile_responsive or equivalent flag must be true',   'error'),
  -- Video rules
  ('video', 'timeline_not_empty',   'Timeline not empty',       'timeline_tracks must have ≥1 track with ≥1 event',             'error'),
  ('video', 'min_one_subject',      'At least 1 character/product', 'characters array or products array must have ≥1 entry',    'error'),
  -- Anime rules
  ('anime', 'series_name_defined',  'Series name defined',      'metadata.series_name must be a non-empty string',              'error'),
  ('anime', 'min_one_named_char',   'At least 1 named character','characters array must have ≥1 entry with an id/name',         'error'),
  -- SaaS rules
  ('saas', 'has_input_node',        'At least 1 input node',    'nodes or missions must include an entry typed input_node',     'error'),
  ('saas', 'has_output_node',       'At least 1 output node',   'nodes or missions must include an entry typed output_node',    'error')
on conflict (zone_type, rule_key) do nothing;

-- RLS
alter table public.wisdom_rules enable row level security;

create policy "Authenticated users can read rules"
  on public.wisdom_rules for select
  using (auth.role() = 'authenticated');

create policy "Service role can manage rules"
  on public.wisdom_rules for all
  using (auth.role() = 'service_role');

-- ─── 3. wisdom_rules_log ─────────────────────────────────────────────────────
-- Immutable audit log of every rule evaluation for every pipeline run.

drop table if exists public.wisdom_rules_log cascade;

create table public.wisdom_rules_log (
  id               uuid        primary key default gen_random_uuid(),
  pipeline_run_id  uuid        references public.pipeline_runs(id) on delete set null,
  zone_type        text        not null,
  rule_key         text        not null,
  passed           boolean     not null,
  reason           text,
  suggested_fix    text,
  severity         text        not null default 'error',
  evaluated_at     timestamptz not null default now()
);

create index if not exists wisdom_rules_log_run_id_idx
  on public.wisdom_rules_log (pipeline_run_id);

create index if not exists wisdom_rules_log_passed_idx
  on public.wisdom_rules_log (passed);

-- RLS
alter table public.wisdom_rules_log enable row level security;

create policy "Users can read own run logs"
  on public.wisdom_rules_log for select
  using (
    pipeline_run_id in (
      select id from public.pipeline_runs where user_id = auth.uid()
    )
  );

create policy "Service role can manage logs"
  on public.wisdom_rules_log for all
  using (auth.role() = 'service_role');
