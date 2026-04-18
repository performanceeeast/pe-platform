-- PE Platform initial schema.
--
-- TODO(rbac): RLS is scoped to "user can only see/edit their own rows" for
-- the foundation. When the portal launches and managers need visibility
-- across teams, extend these policies to read from user_profiles.role and
-- user_profiles.department instead of just auth.uid().

-------------------------------------------------------------------------------
-- Enums
-------------------------------------------------------------------------------

create type public.department as enum (
  'sales', 'service', 'parts', 'fni', 'h2_grow', 'personal', 'other'
);

create type public.task_status as enum (
  'inbox', 'today', 'this_week', 'waiting', 'done', 'archived'
);

create type public.task_source as enum (
  'handwritten', 'calendar', 'manual', 'recurring', 'email', 'claude'
);

create type public.project_status as enum (
  'planning', 'active', 'on_hold', 'completed', 'cancelled'
);

create type public.recurring_frequency as enum (
  'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'
);

create type public.app_role as enum (
  'owner', 'gm', 'manager', 'employee'
);

create type public.app_department as enum (
  'ops', 'sales', 'service', 'parts', 'fni', 'admin'
);

-------------------------------------------------------------------------------
-- Shared: updated_at trigger
-------------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-------------------------------------------------------------------------------
-- user_profiles: extends auth.users with role + department
-------------------------------------------------------------------------------

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role public.app_role not null default 'employee',
  department public.app_department,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_profiles_set_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

-------------------------------------------------------------------------------
-- projects: buckets that link related tasks
-------------------------------------------------------------------------------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  department public.department not null default 'other',
  status public.project_status not null default 'planning',
  start_date date,
  target_end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade
);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-------------------------------------------------------------------------------
-- notes: handwritten-notes archive (pipeline comes later)
-------------------------------------------------------------------------------

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  original_pdf_url text,
  transcribed_text text,
  processed_at timestamptz,
  tasks_extracted_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade
);

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-------------------------------------------------------------------------------
-- tasks: the core entity
-------------------------------------------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  department public.department not null default 'other',
  priority int not null default 2 check (priority between 0 and 3),
  status public.task_status not null default 'inbox',
  due_date timestamptz,
  source public.task_source not null default 'manual',
  source_ref text,
  project_id uuid references public.projects(id) on delete set null,
  note_id uuid references public.notes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid not null references auth.users(id) on delete cascade
);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-------------------------------------------------------------------------------
-- recurring_ops: templates that materialize into tasks on a schedule
-------------------------------------------------------------------------------

create table public.recurring_ops (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  department public.department not null default 'other',
  frequency public.recurring_frequency not null,
  next_due date not null,
  template_description text,
  active boolean not null default true,
  last_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade
);

create trigger recurring_ops_set_updated_at
  before update on public.recurring_ops
  for each row execute function public.set_updated_at();

-------------------------------------------------------------------------------
-- calendar_events_cache: synced from Google Calendar (sync job lands later)
-------------------------------------------------------------------------------

create table public.calendar_events_cache (
  id uuid primary key default gen_random_uuid(),
  google_event_id text not null unique,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  location text,
  created_task_id uuid references public.tasks(id) on delete set null,
  synced_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade
);

-------------------------------------------------------------------------------
-- Indexes
-------------------------------------------------------------------------------

create index tasks_status_due_creator_idx on public.tasks (status, due_date, created_by);
create index tasks_department_status_idx on public.tasks (department, status);
create index tasks_project_idx on public.tasks (project_id);
create index tasks_created_by_idx on public.tasks (created_by);

create index projects_creator_idx on public.projects (created_by);
create index notes_creator_date_idx on public.notes (created_by, date desc);

create index calendar_events_user_start_idx on public.calendar_events_cache (user_id, start_time);
create index recurring_ops_active_next_idx on public.recurring_ops (active, next_due);

-------------------------------------------------------------------------------
-- Row-Level Security
-------------------------------------------------------------------------------

alter table public.user_profiles enable row level security;
alter table public.projects enable row level security;
alter table public.notes enable row level security;
alter table public.tasks enable row level security;
alter table public.recurring_ops enable row level security;
alter table public.calendar_events_cache enable row level security;

-- user_profiles: self only
create policy "user_profiles self select"
  on public.user_profiles for select using (auth.uid() = id);
create policy "user_profiles self insert"
  on public.user_profiles for insert with check (auth.uid() = id);
create policy "user_profiles self update"
  on public.user_profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- created_by convention for everything else
create policy "projects owner crud"
  on public.projects for all using (auth.uid() = created_by) with check (auth.uid() = created_by);

create policy "notes owner crud"
  on public.notes for all using (auth.uid() = created_by) with check (auth.uid() = created_by);

create policy "tasks owner crud"
  on public.tasks for all using (auth.uid() = created_by) with check (auth.uid() = created_by);

create policy "recurring_ops owner crud"
  on public.recurring_ops for all using (auth.uid() = created_by) with check (auth.uid() = created_by);

create policy "calendar_events_cache owner crud"
  on public.calendar_events_cache for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
