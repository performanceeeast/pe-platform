-- Sales foundation, part 4 of 4: lead + appointment tracking.
--
-- Three entities:
--   traffic_log       — one row per walk-in / phone lead (Sales Mgr visibility)
--   appointments      — ISM appointment log (kept / sold tracked for
--                       per-rep performance)
--   daily_lead_counts — ISM rolls up total leads per day when the per-lead
--                       detail isn't worth logging (backfills, bulk days)
--
-- Kept permissive on writes for v1: any user with store access can write to
-- these, since many of them will be edited in real time by whoever is closest
-- to the lead. Tighten later once the UI is in use.

-------------------------------------------------------------------------------
-- traffic_log
-------------------------------------------------------------------------------

create table public.traffic_log (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  traffic_date date not null,
  salesperson_user_id uuid references auth.users(id) on delete set null,
  lead_source_id uuid references public.lead_sources(id) on delete set null,
  customer_name text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger traffic_log_set_updated_at
  before update on public.traffic_log
  for each row execute function public.set_updated_at();

create index traffic_log_store_date_idx on public.traffic_log (store_id, traffic_date desc);
create index traffic_log_salesperson_idx on public.traffic_log (salesperson_user_id, traffic_date desc);

-------------------------------------------------------------------------------
-- appointments (ISM)
-------------------------------------------------------------------------------

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  appt_date date not null,
  customer_name text not null,
  unit_interested text,
  salesperson_user_id uuid references auth.users(id) on delete set null,
  lead_source_id uuid references public.lead_sources(id) on delete set null,
  kept boolean not null default false,
  sold boolean not null default false,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

create index appointments_store_date_idx on public.appointments (store_id, appt_date desc);
create index appointments_salesperson_idx on public.appointments (salesperson_user_id, appt_date desc);
create index appointments_outcome_idx on public.appointments (store_id, kept, sold);

-------------------------------------------------------------------------------
-- daily_lead_counts: aggregate lead counts for ISM (used for backfills or
-- bulk entry when per-lead detail isn't warranted)
-------------------------------------------------------------------------------

create table public.daily_lead_counts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  count_date date not null,
  total_leads int not null default 0 check (total_leads >= 0),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, count_date)
);

create trigger daily_lead_counts_set_updated_at
  before update on public.daily_lead_counts
  for each row execute function public.set_updated_at();

create index daily_lead_counts_store_date_idx on public.daily_lead_counts (store_id, count_date desc);

-------------------------------------------------------------------------------
-- Row-Level Security
-------------------------------------------------------------------------------

alter table public.traffic_log        enable row level security;
alter table public.appointments       enable row level security;
alter table public.daily_lead_counts  enable row level security;

-- traffic_log: store-access read + write
create policy "traffic_log read by store access"
  on public.traffic_log for select to authenticated
  using (public.current_user_has_store_access(store_id));

create policy "traffic_log write by store access"
  on public.traffic_log for all to authenticated
  using (public.current_user_has_store_access(store_id))
  with check (public.current_user_has_store_access(store_id));

-- appointments: store-access read + write
create policy "appointments read by store access"
  on public.appointments for select to authenticated
  using (public.current_user_has_store_access(store_id));

create policy "appointments write by store access"
  on public.appointments for all to authenticated
  using (public.current_user_has_store_access(store_id))
  with check (public.current_user_has_store_access(store_id));

-- daily_lead_counts: read by store access, write by ISM / sales manager / admin
create policy "daily_lead_counts read by store access"
  on public.daily_lead_counts for select to authenticated
  using (public.current_user_has_store_access(store_id));

create policy "daily_lead_counts write by manager"
  on public.daily_lead_counts for all to authenticated
  using (
    public.current_user_is_admin()
    or (
      public.current_user_has_store_access(store_id)
      and (
        public.current_user_has_role_slug('sales_manager')
        or public.current_user_has_role_slug('internet_sales_manager')
      )
    )
  )
  with check (
    public.current_user_is_admin()
    or (
      public.current_user_has_store_access(store_id)
      and (
        public.current_user_has_role_slug('sales_manager')
        or public.current_user_has_role_slug('internet_sales_manager')
      )
    )
  );
