-- Sales foundation, part 1 of 4: additive role grants + store-scoped lookups.
--
-- Why role grants: the 0003 schema assumed each user has a single role via
-- user_profiles.role_id. Cedar Point has one person who acts as both the
-- Sales Manager and the F&I Manager. Rather than invent a combined role,
-- we keep role_id as the "primary" (for display + default app_role) and
-- use user_role_grants as additive capability assignments.
--
-- Why store-scoped lookups: unit types and F&I products differ by store
-- (Goldsboro sells ATVs, Cedar Point sells boats + engine repowers; F&I
-- offers Lifetime Battery at Goldsboro, Gelcoat at Cedar Point). Making
-- these data-driven lets the Operations Manager edit them without a
-- migration.

-------------------------------------------------------------------------------
-- user_role_grants: additive role assignments beyond user_profiles.role_id
-------------------------------------------------------------------------------

create table public.user_role_grants (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null,
  primary key (user_id, role_id)
);

create index user_role_grants_role_idx on public.user_role_grants (role_id);

-------------------------------------------------------------------------------
-- unit_types: store-scoped list of sellable unit categories
--   Goldsboro: ATV, SXS, PWC, BOAT, TRAILER, YOUTH
--   Cedar Point: BOAT, ENGINE REPOWER, TRAILER
-------------------------------------------------------------------------------

create table public.unit_types (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  slug text not null,
  label text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, slug)
);

create trigger unit_types_set_updated_at
  before update on public.unit_types
  for each row execute function public.set_updated_at();

create index unit_types_store_idx on public.unit_types (store_id, sort_order);

insert into public.unit_types (store_id, slug, label, sort_order)
select s.id, x.slug, x.label, x.sort_order
from public.stores s
cross join (values
  ('atv',     'ATV',     10),
  ('sxs',     'SXS',     20),
  ('pwc',     'PWC',     30),
  ('boat',    'BOAT',    40),
  ('trailer', 'TRAILER', 50),
  ('youth',   'YOUTH',   60)
) as x(slug, label, sort_order)
where s.slug = 'goldsboro';

insert into public.unit_types (store_id, slug, label, sort_order)
select s.id, x.slug, x.label, x.sort_order
from public.stores s
cross join (values
  ('boat',            'BOAT',            10),
  ('engine_repower',  'ENGINE REPOWER',  20),
  ('trailer',         'TRAILER',         30)
) as x(slug, label, sort_order)
where s.slug = 'cedar-point';

-------------------------------------------------------------------------------
-- fni_products: store-scoped list of back-end products / checkboxes
--   Goldsboro: Extended Warranty, Lifetime Oil Change, GAP, Lifetime Battery
--   Cedar Point: Extended Warranty, Prepaid Maintenance, Gelcoat Protection, GAP
-------------------------------------------------------------------------------

create table public.fni_products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  slug text not null,
  label text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, slug)
);

create trigger fni_products_set_updated_at
  before update on public.fni_products
  for each row execute function public.set_updated_at();

create index fni_products_store_idx on public.fni_products (store_id, sort_order);

insert into public.fni_products (store_id, slug, label, sort_order)
select s.id, x.slug, x.label, x.sort_order
from public.stores s
cross join (values
  ('extended_warranty',   'Extended Warranty',   10),
  ('lifetime_oil_change', 'Lifetime Oil Change', 20),
  ('gap',                 'GAP',                 30),
  ('lifetime_battery',    'Lifetime Battery',    40)
) as x(slug, label, sort_order)
where s.slug = 'goldsboro';

insert into public.fni_products (store_id, slug, label, sort_order)
select s.id, x.slug, x.label, x.sort_order
from public.stores s
cross join (values
  ('extended_warranty',    'Extended Warranty',    10),
  ('prepaid_maintenance',  'Prepaid Maintenance',  20),
  ('gelcoat_protection',   'Gelcoat Protection',   30),
  ('gap',                  'GAP',                  40)
) as x(slug, label, sort_order)
where s.slug = 'cedar-point';

-------------------------------------------------------------------------------
-- lead_sources: store-scoped list of where a lead / walk-in originated
-------------------------------------------------------------------------------

create table public.lead_sources (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  slug text not null,
  label text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, slug)
);

create trigger lead_sources_set_updated_at
  before update on public.lead_sources
  for each row execute function public.set_updated_at();

create index lead_sources_store_idx on public.lead_sources (store_id, sort_order);

insert into public.lead_sources (store_id, slug, label, sort_order)
select s.id, x.slug, x.label, x.sort_order
from public.stores s
cross join (values
  ('website',  'Website',  10),
  ('facebook', 'Facebook', 20),
  ('walk_in',  'Walk-In',  30),
  ('phone',    'Phone',    40),
  ('other',    'Other',    50)
) as x(slug, label, sort_order);

-------------------------------------------------------------------------------
-- Helper: current_user_has_role_slug
--   Checks user_profiles.role_id AND user_role_grants. Used by RLS below and
--   by later sales migrations to authorize "sales manager can edit" etc.
-------------------------------------------------------------------------------

create or replace function public.current_user_has_role_slug(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_profiles up
    join public.roles r on r.id = up.role_id
    where up.id = auth.uid() and r.slug = p_slug
  ) or exists (
    select 1
    from public.user_role_grants g
    join public.roles r on r.id = g.role_id
    where g.user_id = auth.uid() and r.slug = p_slug
  );
$$;

alter function public.current_user_has_role_slug(text) set search_path = '';

-------------------------------------------------------------------------------
-- Row-Level Security
-------------------------------------------------------------------------------

alter table public.user_role_grants enable row level security;
alter table public.unit_types       enable row level security;
alter table public.fni_products     enable row level security;
alter table public.lead_sources     enable row level security;

-- user_role_grants: user sees their own grants; admins manage all.
create policy "user_role_grants self select"
  on public.user_role_grants for select
  to authenticated
  using (user_id = auth.uid() or public.current_user_is_admin());

create policy "user_role_grants admin write"
  on public.user_role_grants for all
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- unit_types / fni_products / lead_sources: readable by anyone with store
-- access; writable by admin only (Operations Manager has gm app_role and
-- therefore passes current_user_is_admin).
create policy "unit_types read by store access"
  on public.unit_types for select
  to authenticated
  using (public.current_user_has_store_access(store_id));

create policy "unit_types admin write"
  on public.unit_types for all
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

create policy "fni_products read by store access"
  on public.fni_products for select
  to authenticated
  using (public.current_user_has_store_access(store_id));

create policy "fni_products admin write"
  on public.fni_products for all
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

create policy "lead_sources read by store access"
  on public.lead_sources for select
  to authenticated
  using (public.current_user_has_store_access(store_id));

create policy "lead_sources admin write"
  on public.lead_sources for all
  to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());
