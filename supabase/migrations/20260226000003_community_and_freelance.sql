-- Migration: community_posts, post_likes, post_comments, jobs, job_applications
-- Supports /community and /freelance pages with Supabase Realtime

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. community_posts
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.community_posts (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  project_id    uuid,                        -- optional link to a pipeline_run / project
  zone_type     text        check (zone_type in ('game','website','anime','saas','video')),
  title         text        not null,
  description   text        not null,
  preview_url   text,
  like_count    integer     not null default 0,
  comment_count integer     not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists community_posts_user_id_idx      on public.community_posts (user_id);
create index if not exists community_posts_zone_type_idx    on public.community_posts (zone_type);
create index if not exists community_posts_created_at_idx   on public.community_posts (created_at desc);

drop trigger if exists community_posts_updated_at on public.community_posts;
create trigger community_posts_updated_at
  before update on public.community_posts
  for each row execute procedure public.set_updated_at();

alter table public.community_posts enable row level security;

create policy "Authenticated can read posts"
  on public.community_posts for select
  using (auth.role() = 'authenticated');

create policy "Users can insert own posts"
  on public.community_posts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own posts"
  on public.community_posts for update
  using (auth.uid() = user_id);

create policy "Users can delete own posts"
  on public.community_posts for delete
  using (auth.uid() = user_id);

create policy "Admins can manage community_posts"
  on public.community_posts for all
  using (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. post_likes  (one row per user per post)
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.post_likes (
  post_id    uuid not null references public.community_posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

create policy "Authenticated can read likes"
  on public.post_likes for select
  using (auth.role() = 'authenticated');

create policy "Users can like posts"
  on public.post_likes for insert
  with check (auth.uid() = user_id);

create policy "Users can unlike posts"
  on public.post_likes for delete
  using (auth.uid() = user_id);

-- Trigger to keep community_posts.like_count in sync
create or replace function public.sync_like_count()
returns trigger language plpgsql as $$
begin
  if (TG_OP = 'INSERT') then
    update public.community_posts set like_count = like_count + 1 where id = NEW.post_id;
  elsif (TG_OP = 'DELETE') then
    update public.community_posts set like_count = greatest(like_count - 1, 0) where id = OLD.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists post_likes_sync on public.post_likes;
create trigger post_likes_sync
  after insert or delete on public.post_likes
  for each row execute procedure public.sync_like_count();

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. post_comments  (supports top-level + threaded replies via parent_id)
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.post_comments (
  id         uuid        primary key default gen_random_uuid(),
  post_id    uuid        not null references public.community_posts(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  parent_id  uuid        references public.post_comments(id) on delete cascade,
  body       text        not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists post_comments_post_id_idx   on public.post_comments (post_id);
create index if not exists post_comments_parent_id_idx on public.post_comments (parent_id);

drop trigger if exists post_comments_updated_at on public.post_comments;
create trigger post_comments_updated_at
  before update on public.post_comments
  for each row execute procedure public.set_updated_at();

alter table public.post_comments enable row level security;

create policy "Authenticated can read comments"
  on public.post_comments for select
  using (auth.role() = 'authenticated');

create policy "Users can insert own comments"
  on public.post_comments for insert
  with check (auth.uid() = user_id);

create policy "Users can update own comments"
  on public.post_comments for update
  using (auth.uid() = user_id);

create policy "Users can delete own comments"
  on public.post_comments for delete
  using (auth.uid() = user_id);

-- Trigger to keep community_posts.comment_count in sync
create or replace function public.sync_comment_count()
returns trigger language plpgsql as $$
begin
  if (TG_OP = 'INSERT') then
    update public.community_posts set comment_count = comment_count + 1 where id = NEW.post_id;
  elsif (TG_OP = 'DELETE') then
    update public.community_posts set comment_count = greatest(comment_count - 1, 0) where id = OLD.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists post_comments_sync on public.post_comments;
create trigger post_comments_sync
  after insert or delete on public.post_comments
  for each row execute procedure public.sync_comment_count();

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. jobs
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.jobs (
  id              uuid        primary key default gen_random_uuid(),
  poster_id       uuid        not null references auth.users(id) on delete cascade,
  title           text        not null,
  description     text        not null,
  zone_type       text        check (zone_type in ('game','website','anime','saas','video','other')),
  budget_min      integer,
  budget_max      integer,
  budget_currency text        not null default 'USD',
  is_open         boolean     not null default true,
  application_count integer   not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists jobs_poster_id_idx    on public.jobs (poster_id);
create index if not exists jobs_zone_type_idx    on public.jobs (zone_type);
create index if not exists jobs_is_open_idx      on public.jobs (is_open);
create index if not exists jobs_created_at_idx   on public.jobs (created_at desc);

drop trigger if exists jobs_updated_at on public.jobs;
create trigger jobs_updated_at
  before update on public.jobs
  for each row execute procedure public.set_updated_at();

alter table public.jobs enable row level security;

create policy "Authenticated can read open jobs"
  on public.jobs for select
  using (auth.role() = 'authenticated');

create policy "Users can post jobs"
  on public.jobs for insert
  with check (auth.uid() = poster_id);

create policy "Poster can update own jobs"
  on public.jobs for update
  using (auth.uid() = poster_id);

create policy "Poster can delete own jobs"
  on public.jobs for delete
  using (auth.uid() = poster_id);

create policy "Admins can manage jobs"
  on public.jobs for all
  using (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. job_applications
-- ──────────────────────────────────────────────────────────────────────────────
create table if not exists public.job_applications (
  id          uuid        primary key default gen_random_uuid(),
  job_id      uuid        not null references public.jobs(id) on delete cascade,
  applicant_id uuid       not null references auth.users(id) on delete cascade,
  message     text        not null,
  status      text        not null default 'pending'
              check (status in ('pending','accepted','rejected')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (job_id, applicant_id)   -- one application per user per job
);

create index if not exists job_applications_job_id_idx       on public.job_applications (job_id);
create index if not exists job_applications_applicant_id_idx on public.job_applications (applicant_id);

drop trigger if exists job_applications_updated_at on public.job_applications;
create trigger job_applications_updated_at
  before update on public.job_applications
  for each row execute procedure public.set_updated_at();

-- Trigger to keep jobs.application_count in sync
create or replace function public.sync_application_count()
returns trigger language plpgsql as $$
begin
  if (TG_OP = 'INSERT') then
    update public.jobs set application_count = application_count + 1 where id = NEW.job_id;
  elsif (TG_OP = 'DELETE') then
    update public.jobs set application_count = greatest(application_count - 1, 0) where id = OLD.job_id;
  end if;
  return null;
end;
$$;

drop trigger if exists job_applications_sync on public.job_applications;
create trigger job_applications_sync
  after insert or delete on public.job_applications
  for each row execute procedure public.sync_application_count();

alter table public.job_applications enable row level security;

-- Applicant sees own applications; poster sees applications for their jobs
create policy "Applicants can read own applications"
  on public.job_applications for select
  using (auth.uid() = applicant_id);

create policy "Poster can read applications for own jobs"
  on public.job_applications for select
  using (
    exists (
      select 1 from public.jobs
      where jobs.id = job_applications.job_id and jobs.poster_id = auth.uid()
    )
  );

create policy "Users can submit applications"
  on public.job_applications for insert
  with check (auth.uid() = applicant_id);

create policy "Poster can update application status"
  on public.job_applications for update
  using (
    exists (
      select 1 from public.jobs
      where jobs.id = job_applications.job_id and jobs.poster_id = auth.uid()
    )
  );

create policy "Applicant can withdraw application"
  on public.job_applications for delete
  using (auth.uid() = applicant_id);

create policy "Admins can manage job_applications"
  on public.job_applications for all
  using (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. Enable Realtime for live-updating tables
-- ──────────────────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.community_posts;
alter publication supabase_realtime add table public.post_likes;
alter publication supabase_realtime add table public.post_comments;
alter publication supabase_realtime add table public.jobs;
alter publication supabase_realtime add table public.job_applications;
