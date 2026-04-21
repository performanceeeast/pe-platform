-- Portal foundation: stores, specific job roles, user<->store access,
-- and the targets scaffold that manager dashboards will read from later.
--
-- This migration does not touch any of the ops-app tables (tasks, projects,
-- notes, recurring_ops) — their RLS stays "auth.uid() = created_by" for now.
-- Manager-visibility RLS will come once we wire real data into dashboards.

-------------------------------------------------------------------------------
-- stores: physical dealership locations
-------------------------------------------------------------------------------

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger stores_set_updated_at
  before update on public.stores
  for each row execute function public.set_updated_at();

insert into public.stores (slug, name) values
  ('goldsboro',   'Goldsboro'),
  ('cedar-point', 'Cedar Point');

-------------------------------------------------------------------------------
-- roles: specific job titles (distinct from coarse app_role enum)
--   - rank drives UI affordances (managers see target-setting, etc.)
--   - default_app_role copies onto user_profiles.role when assigned, so RLS
--     and coarse permissions stay enum-driven.
-------------------------------------------------------------------------------

create type public.role_rank as enum ('owner', 'manager', 'senior', 'employee');

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  department public.app_department not null,
  rank public.role_rank not null,
  default_app_role public.app_role not null,
  created_at timestamptz not null default now()
);

insert into public.roles (slug, name, department, rank, default_app_role) values
  ('owner',                  'Owner',                      'admin',   'owner',    'owner'),
  ('ops_manager',            'Operations Manager',         'admin',   'manager',  'gm'),
  ('hr',                     'HR',                         'admin',   'manager',  'gm'),
  ('sales_manager',          'Sales Manager',              'sales',   'manager',  'manager'),
  ('internet_sales_manager', 'Internet Sales Manager',     'sales',   'manager',  'manager'),
  ('salesperson',            'Salesperson',                'sales',   'employee', 'employee'),
  ('sales_associate',        'Sales Associate',            'sales',   'employee', 'employee'),
  ('service_manager',        'Service Manager',            'service', 'manager',  'manager'),
  ('service_writer',         'Service Writer',             'service', 'senior',   'employee'),
  ('technician',             'Technician',                 'service', 'employee', 'employee'),
  ('parts_manager',          'Parts Manager',              'parts',   'manager',  'manager'),
  ('parts_counter',          'Parts Counter / Associate',  'parts',   'employee', 'employee'),
  ('fni_manager',            'F&I Manager',                'fni',     'manager',  'manager');

-------------------------------------------------------------------------------
-- user_profiles: add role_id, primary_store_id, active
-------------------------------------------------------------------------------

alter table public.user_profiles
  add column role_id uuid references public.roles(id),
  add column primary_store_id uuid references public.stores(id),
  add column active boolean not null default true;

create index user_profiles_role_idx on public.user_profiles (role_id);
create index user_profiles_primary_store_idx on public.user_profiles (primary_store_id);

-------------------------------------------------------------------------------
-- user_store_access: many-to-many — which stores can a user log into
-------------------------------------------------------------------------------

create table public.user_store_access (
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null,
  primary key (user_id, store_id)
);

create index user_store_access_store_idx on public.user_store_access (store_id);

-- Backfill: any existing 'owner' user gets access to every store.
insert into public.user_store_access (user_id, store_id)
select up.id, s.id
from public.user_profiles up
cross join public.stores s
where up.role = 'owner'
on conflict do nothing;

-- Backfill: set primary_store_id for existing owners to Goldsboro (arbitrary
-- choice; owner can switch at any time). No-op if no owner exists yet.
update public.user_profiles
set primary_store_id = (select id from public.stores where slug = 'goldsboro')
where role = 'owner' and primary_store_id is null;

-- Backfill: set role_id for existing owners to the 'owner' role.
update public.user_profiles
set role_id = (select id from public.roles where slug = 'owner')
where role = 'owner' and role_id is null;

-------------------------------------------------------------------------------
-- targets: goals/quotas assigned to a user by a manager
--   Scaffold only — no UI yet. Matthew will populate via admin surface once
--   pay plans are finalized.
-------------------------------------------------------------------------------

create table public.targets (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  assigned_to_user_id uuid not null references auth.users(id) on delete cascade,
  assigned_by_user_id uuid references auth.users(id) on delete set null,
  metric text not null,
  period_start date not null,
  period_end date not null,
  target_value numeric not null,
  actual_value numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger targets_set_updated_at
  before update on public.targets
  for each row execute function public.set_updated_at();

create index targets_assignee_period_idx on public.targets (assigned_to_user_id, period_start desc);
create index targets_store_period_idx on public.targets (store_id, period_start desc);

-------------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so RLS can call without recursion)
-------------------------------------------------------------------------------

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.user_profiles where id = auth.uid();
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select role in ('owner', 'gm') from public.user_profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.current_user_has_store_access(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_store_access
    where user_id = auth.uid() and store_id = p_store_id
  ) or public.current_user_is_admin();
$$;

-------------------------------------------------------------------------------
-- Row-Level Security
-------------------------------------------------------------------------------

alter table public.stores enable row level security;
alter table public.roles enable row level security;
alter table public.user_store_access enable row level security;
alter table public.targets enable row level security;

-- stores: any authenticated user can read; only admins can write.
create policy "stores read authenticated"
  on public.stores for select
  to authenticated
  using (true);

create policy "stores admin write"
  on public.stores for all
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- roles: any authenticated user can read; only admins can write.
create policy "roles read authenticated"
  on public.roles for select
  to authenticated
  using (true);

create policy "roles admin write"
  on public.roles for all
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- user_store_access: user sees their own rows; admins see and write all.
create policy "user_store_access self select"
  on public.user_store_access for select
  to authenticated
  using (user_id = auth.uid() or public.current_user_is_admin());

create policy "user_store_access admin write"
  on public.user_store_access for all
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- targets:
--   select: the assignee, the assigner, or an admin
--   insert: only managers+ can create, and assigned_by must be themselves
--   update: the assigner or an admin (assignee updates actuals via a separate
--           surface later — for now, managers own the row)
--   delete: the assigner or an admin
create policy "targets visible to assignee assigner admin"
  on public.targets for select
  to authenticated
  using (
    assigned_to_user_id = auth.uid()
    or assigned_by_user_id = auth.uid()
    or public.current_user_is_admin()
  );

create policy "targets insert by manager"
  on public.targets for insert
  to authenticated
  with check (
    assigned_by_user_id = auth.uid()
    and public.current_app_role() in ('owner', 'gm', 'manager')
  );

create policy "targets update by assigner or admin"
  on public.targets for update
  to authenticated
  using (assigned_by_user_id = auth.uid() or public.current_user_is_admin())
  with check (assigned_by_user_id = auth.uid() or public.current_user_is_admin());

create policy "targets delete by assigner or admin"
  on public.targets for delete
  to authenticated
  using (assigned_by_user_id = auth.uid() or public.current_user_is_admin());

-------------------------------------------------------------------------------
-- Lock function search_path (advisor requirement, mirrors 0002)
-------------------------------------------------------------------------------

alter function public.current_app_role() set search_path = '';
alter function public.current_user_is_admin() set search_path = '';
alter function public.current_user_has_store_access(uuid) set search_path = '';
