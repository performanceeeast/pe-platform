-- Sales foundation, part 2 of 4: monthly config that the Ops Manager (and
-- shared with Sales Manager) edits. Dashboards + leaderboards read from
-- these tables.
--
-- Period model: (year, month) integer pair rather than a date range. Matches
-- how the reference dashboard buckets data and keeps queries simple. If we
-- later want quarterly goals, we add a separate table.
--
-- Editable by: admin (owner + ops_manager via gm app_role) OR a user with
-- the sales_manager role (primary or granted) who also has store access.
-- Sales Associates / ISM / F&I get read-only.

-------------------------------------------------------------------------------
-- Reusable write-guard: sales manager OR admin, store-scoped
-------------------------------------------------------------------------------

create or replace function public.current_user_can_manage_sales_config(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_user_is_admin()
      or (
        public.current_user_has_store_access(p_store_id)
        and public.current_user_has_role_slug('sales_manager')
      );
$$;

alter function public.current_user_can_manage_sales_config(uuid) set search_path = '';

-------------------------------------------------------------------------------
-- sales_goals: per-store, per-month unit-type targets + stretch + payouts
-------------------------------------------------------------------------------

create table public.sales_goals (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  unit_type_id uuid not null references public.unit_types(id) on delete cascade,
  year int not null check (year between 2020 and 2100),
  month int not null check (month between 1 and 12),
  target numeric not null default 0,
  stretch numeric not null default 0,
  payout numeric not null default 0,
  stretch_payout numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, year, month, unit_type_id)
);

create trigger sales_goals_set_updated_at
  before update on public.sales_goals
  for each row execute function public.set_updated_at();

create index sales_goals_store_period_idx on public.sales_goals (store_id, year, month);

-------------------------------------------------------------------------------
-- pga_tiers: tiered spiff amounts based on PG&A dollars per deal
-------------------------------------------------------------------------------

create table public.pga_tiers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  year int not null check (year between 2020 and 2100),
  month int not null check (month between 1 and 12),
  min_amount numeric not null,
  max_amount numeric not null,
  spiff_amount numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_amount >= min_amount),
  unique (store_id, year, month, min_amount)
);

create trigger pga_tiers_set_updated_at
  before update on public.pga_tiers
  for each row execute function public.set_updated_at();

create index pga_tiers_store_period_idx on public.pga_tiers (store_id, year, month);

-------------------------------------------------------------------------------
-- be_spiffs: back-end product spiffs (amount per product sold, per month)
-------------------------------------------------------------------------------

create table public.be_spiffs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  fni_product_id uuid not null references public.fni_products(id) on delete cascade,
  year int not null check (year between 2020 and 2100),
  month int not null check (month between 1 and 12),
  amount numeric not null default 0,
  all_products_bonus numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, year, month, fni_product_id)
);

create trigger be_spiffs_set_updated_at
  before update on public.be_spiffs
  for each row execute function public.set_updated_at();

create index be_spiffs_store_period_idx on public.be_spiffs (store_id, year, month);

-------------------------------------------------------------------------------
-- contests: monthly sales contests with winner tracking
-------------------------------------------------------------------------------

create table public.contests (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  year int not null check (year between 2020 and 2100),
  month int not null check (month between 1 and 12),
  name text not null,
  description text,
  prize text,
  winner_user_id uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger contests_set_updated_at
  before update on public.contests
  for each row execute function public.set_updated_at();

create index contests_store_period_idx on public.contests (store_id, year, month);

-------------------------------------------------------------------------------
-- aged_inventory: the "hit list" — units over 120 days old with optional
-- spiff bonus. sold_by + sold_at get filled when a salesperson moves the unit.
-------------------------------------------------------------------------------

create table public.aged_inventory (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  stock_number text not null,
  description text,
  date_in_stock date,
  spiff_amount numeric not null default 0,
  sold_by_user_id uuid references auth.users(id) on delete set null,
  sold_at date,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, stock_number)
);

create trigger aged_inventory_set_updated_at
  before update on public.aged_inventory
  for each row execute function public.set_updated_at();

create index aged_inventory_store_sold_idx on public.aged_inventory (store_id, sold_at);

-------------------------------------------------------------------------------
-- promo_docs: uploaded PDFs for the Promotion Hub (rebates, financing).
-- Actual file lives in Supabase Storage; we store the path + metadata.
-------------------------------------------------------------------------------

create table public.promo_docs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade,
  title text not null,
  storage_path text not null,
  effective_start date,
  effective_end date,
  notes text,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger promo_docs_set_updated_at
  before update on public.promo_docs
  for each row execute function public.set_updated_at();

create index promo_docs_store_effective_idx on public.promo_docs (store_id, effective_start desc);

-------------------------------------------------------------------------------
-- Row-Level Security
-------------------------------------------------------------------------------

alter table public.sales_goals    enable row level security;
alter table public.pga_tiers      enable row level security;
alter table public.be_spiffs      enable row level security;
alter table public.contests       enable row level security;
alter table public.aged_inventory enable row level security;
alter table public.promo_docs     enable row level security;

-- Uniform pattern: read = store access, write = sales manager or admin.
create policy "sales_goals read by store access"
  on public.sales_goals for select to authenticated
  using (public.current_user_has_store_access(store_id));

create policy "sales_goals manage by sales manager or admin"
  on public.sales_goals for all to authenticated
  using (public.current_user_can_manage_sales_config(store_id))
  with check (public.current_user_can_manage_sales_config(store_id));

create policy "pga_tiers read by store access"
  on public.pga_tiers for select to authenticated
  using (public.current_user_has_store_access(store_id));

create policy "pga_tiers manage by sales manager or admin"
  on public.pga_tiers for all to authenticated
  using (public.current_user_can_manage_sales_config(store_id))
  with check (public.current_user_can_manage_sales_config(store_id));

create policy "be_spiffs read by store access"
  on public.be_spiffs for select to authenticated
  using (public.current_user_has_store_access(store_id));

create policy "be_spiffs manage by sales manager or admin"
  on public.be_spiffs for all to authenticated
  using (public.current_user_can_manage_sales_config(store_id))
  with check (public.current_user_can_manage_sales_config(store_id));

create policy "contests read by store access"
  on public.contests for select to authenticated
  using (public.current_user_has_store_access(store_id));

create policy "contests manage by sales manager or admin"
  on public.contests for all to authenticated
  using (public.current_user_can_manage_sales_config(store_id))
  with check (public.current_user_can_manage_sales_config(store_id));

create policy "aged_inventory read by store access"
  on public.aged_inventory for select to authenticated
  using (public.current_user_has_store_access(store_id));

create policy "aged_inventory manage by sales manager or admin"
  on public.aged_inventory for all to authenticated
  using (public.current_user_can_manage_sales_config(store_id))
  with check (public.current_user_can_manage_sales_config(store_id));

-- promo_docs: store-scoped reads, but global docs (store_id null) are
-- readable by anyone authenticated. Writes still gated to admin.
create policy "promo_docs read by store access or global"
  on public.promo_docs for select to authenticated
  using (store_id is null or public.current_user_has_store_access(store_id));

create policy "promo_docs manage by sales manager or admin"
  on public.promo_docs for all to authenticated
  using (
    store_id is null and public.current_user_is_admin()
    or store_id is not null and public.current_user_can_manage_sales_config(store_id)
  )
  with check (
    store_id is null and public.current_user_is_admin()
    or store_id is not null and public.current_user_can_manage_sales_config(store_id)
  );
