-- Migration: characters table for Anime Studio
-- Characters persist across episodes via series_name + name composite key

create table if not exists public.characters (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  series_name  text        not null,
  name         text        not null,
  avatar_seed  float8      not null default 0.5,
  face_seed    float8      not null default 0.5,
  body_seed    float8      not null default 0.5,
  costume_seed float8      not null default 0.5,
  voice_seed   float8      not null default 0.5,
  power_seed   float8      not null default 0.5,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Unique within a series: same character name = same pixels across episodes
  unique (user_id, series_name, name)
);

create index if not exists characters_user_id_idx     on public.characters (user_id);
create index if not exists characters_series_name_idx on public.characters (user_id, series_name);

-- updated_at trigger (reuses the set_updated_at() function from migration 001)
drop trigger if exists characters_updated_at on public.characters;
create trigger characters_updated_at
  before update on public.characters
  for each row execute procedure public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.characters enable row level security;

create policy "Users can read own characters"
  on public.characters for select
  using (auth.uid() = user_id);

create policy "Users can insert own characters"
  on public.characters for insert
  with check (auth.uid() = user_id);

create policy "Users can update own characters"
  on public.characters for update
  using (auth.uid() = user_id);

create policy "Users can delete own characters"
  on public.characters for delete
  using (auth.uid() = user_id);

create policy "Service role can manage characters"
  on public.characters for all
  using (auth.role() = 'service_role');
