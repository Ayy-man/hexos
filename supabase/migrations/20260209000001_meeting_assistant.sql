-- Migration: Meeting Assistant Foundation
-- Creates meetings, meeting_links, meeting_participants, meeting_tasks tables
-- with RLS policies restricted to admin role only

-- ============================================================================
-- MEETINGS TABLE
-- ============================================================================

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  meeting_url text not null,
  platform text not null check (platform in ('zoom', 'google_meet', 'teams', 'other')),
  recall_bot_id text,
  recall_recording_url text,
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  transcript jsonb,
  summary text,
  key_decisions jsonb,
  status text not null default 'pending' check (status in ('pending', 'joining', 'recording', 'processing', 'ready', 'failed')),
  error_message text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists meetings_created_by_idx on public.meetings(created_by);
create index if not exists meetings_status_idx on public.meetings(status);
create index if not exists meetings_created_at_idx on public.meetings(created_at desc);

-- RLS
alter table public.meetings enable row level security;

create policy admin_full_access on public.meetings
  for all
  using (get_user_role() = 'admin')
  with check (get_user_role() = 'admin');

-- Updated_at trigger
drop trigger if exists meetings_updated_at on public.meetings;
create trigger meetings_updated_at
  before update on public.meetings
  for each row
  execute function update_updated_at_column();

-- ============================================================================
-- MEETING_LINKS TABLE
-- ============================================================================

create table if not exists public.meeting_links (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  linkable_type text not null check (linkable_type in ('project', 'inquiry', 'conversation')),
  linkable_id uuid not null,
  created_at timestamptz not null default now(),
  unique(meeting_id, linkable_type, linkable_id)
);

-- Indexes
create index if not exists meeting_links_meeting_id_idx on public.meeting_links(meeting_id);
create index if not exists meeting_links_linkable_idx on public.meeting_links(linkable_type, linkable_id);

-- RLS
alter table public.meeting_links enable row level security;

create policy admin_full_access on public.meeting_links
  for all
  using (get_user_role() = 'admin')
  with check (get_user_role() = 'admin');

-- ============================================================================
-- MEETING_PARTICIPANTS TABLE
-- ============================================================================

create table if not exists public.meeting_participants (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  display_name text not null,
  email text,
  profile_id uuid references public.profiles(id),
  speaker_label text,
  created_at timestamptz not null default now(),
  unique(meeting_id, email)
);

-- Indexes
create index if not exists meeting_participants_meeting_id_idx on public.meeting_participants(meeting_id);
create index if not exists meeting_participants_profile_id_idx on public.meeting_participants(profile_id);

-- RLS
alter table public.meeting_participants enable row level security;

create policy admin_full_access on public.meeting_participants
  for all
  using (get_user_role() = 'admin')
  with check (get_user_role() = 'admin');

-- ============================================================================
-- MEETING_TASKS TABLE
-- ============================================================================

create table if not exists public.meeting_tasks (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references public.meetings(id) on delete set null,
  title text not null,
  description text,
  assigned_to_name text,
  assigned_to_profile uuid references public.profiles(id),
  due_date date,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'done', 'cancelled')),
  project_id uuid,
  inquiry_id uuid,
  deliverable_id uuid,
  source text not null default 'ai_extracted' check (source in ('ai_extracted', 'manual', 'imported')),
  created_by uuid not null references public.profiles(id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists meeting_tasks_meeting_id_idx on public.meeting_tasks(meeting_id);
create index if not exists meeting_tasks_assigned_to_profile_idx on public.meeting_tasks(assigned_to_profile);
create index if not exists meeting_tasks_status_idx on public.meeting_tasks(status);
create index if not exists meeting_tasks_project_id_idx on public.meeting_tasks(project_id);
create index if not exists meeting_tasks_due_date_idx on public.meeting_tasks(due_date);

-- RLS
alter table public.meeting_tasks enable row level security;

create policy admin_full_access on public.meeting_tasks
  for all
  using (get_user_role() = 'admin')
  with check (get_user_role() = 'admin');

-- Updated_at trigger
drop trigger if exists meeting_tasks_updated_at on public.meeting_tasks;
create trigger meeting_tasks_updated_at
  before update on public.meeting_tasks
  for each row
  execute function update_updated_at_column();
