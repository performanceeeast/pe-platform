-- Sales foundation, part 3 of 4: the core deal log.
--
-- Flow: salesperson logs the deal (date, customer, deal#, unit_type, pga_total)
-- which sets status = pending_finance. Finance manager fills finance_reserve,
-- back_end_total, and checks off F&I products via deal_fni_products, moving
-- status to complete. Inverse flow is supported: finance can create first,
-- setting status = pending_salesperson until the salesperson fills the
-- front-end fields.
--
-- Single unit type per deal for now. If a deal moves multiple unit types, it
-- gets logged as separate rows — matches the reference dashboard and keeps
-- leaderboards by-type straightforward.

create type public.deal_status as enum (
  'pending_finance',
  'pending_salesperson',
  'complete',
  'delivered'
);

-------------------------------------------------------------------------------
-- deals
-------------------------------------------------------------------------------

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  deal_date date not null,
  deal_number text,
  customer_name text not null,
  salesperson_user_id uuid references auth.users(id) on delete set null,
  finance_manager_user_id uuid references auth.users(id) on delete set null,
  unit_type_id uuid references public.unit_types(id) on delete set null,
  unit_count int not null default 1 check (unit_count > 0),
  pga_total numeric,
  finance_reserve numeric,
  back_end_total numeric,
  status public.deal_status not null default 'pending_finance',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, deal_number)
);

create trigger deals_set_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

create index deals_store_date_idx on public.deals (store_id, deal_date desc);
create index deals_salesperson_date_idx on public.deals (salesperson_user_id, deal_date desc);
create index deals_finance_mgr_idx on public.deals (finance_manager_user_id);
create index deals_status_idx on public.deals (store_id, status);

-------------------------------------------------------------------------------
-- deal_fni_products: join of deal × F&I product (row exists = product sold)
-------------------------------------------------------------------------------

create table public.deal_fni_products (
  deal_id uuid not null references public.deals(id) on delete cascade,
  fni_product_id uuid not null references public.fni_products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (deal_id, fni_product_id)
);

create index deal_fni_products_product_idx on public.deal_fni_products (fni_product_id);

-------------------------------------------------------------------------------
-- Helper: is current user allowed to edit a specific deal?
--   Admins, the deal's salesperson, the deal's finance manager, or anyone
--   with sales_manager / fni_manager role in that store.
-------------------------------------------------------------------------------

create or replace function public.current_user_can_edit_deal(p_deal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_user_is_admin()
      or exists (
        select 1
        from public.deals d
        where d.id = p_deal_id
          and (
            d.salesperson_user_id = auth.uid()
            or d.finance_manager_user_id = auth.uid()
            or (
              public.current_user_has_store_access(d.store_id)
              and (
                public.current_user_has_role_slug('sales_manager')
                or public.current_user_has_role_slug('fni_manager')
              )
            )
          )
      );
$$;

alter function public.current_user_can_edit_deal(uuid) set search_path = '';

-------------------------------------------------------------------------------
-- Row-Level Security
-------------------------------------------------------------------------------

alter table public.deals              enable row level security;
alter table public.deal_fni_products  enable row level security;

-- deals:
--   select: anyone with store access (needed for leaderboards / dashboards)
--   insert: any user with store access — they'll either create as the
--           salesperson (front-end fields) or the finance manager
--   update / delete: the salesperson, finance manager, sales/F&I manager,
--                    or admin
create policy "deals read by store access"
  on public.deals for select to authenticated
  using (public.current_user_has_store_access(store_id));

create policy "deals insert by store user"
  on public.deals for insert to authenticated
  with check (
    public.current_user_has_store_access(store_id)
    and created_by = auth.uid()
  );

create policy "deals update by participant or manager"
  on public.deals for update to authenticated
  using (
    public.current_user_is_admin()
    or salesperson_user_id = auth.uid()
    or finance_manager_user_id = auth.uid()
    or (
      public.current_user_has_store_access(store_id)
      and (
        public.current_user_has_role_slug('sales_manager')
        or public.current_user_has_role_slug('fni_manager')
      )
    )
  )
  with check (
    public.current_user_is_admin()
    or salesperson_user_id = auth.uid()
    or finance_manager_user_id = auth.uid()
    or (
      public.current_user_has_store_access(store_id)
      and (
        public.current_user_has_role_slug('sales_manager')
        or public.current_user_has_role_slug('fni_manager')
      )
    )
  );

create policy "deals delete by manager or admin"
  on public.deals for delete to authenticated
  using (
    public.current_user_is_admin()
    or (
      public.current_user_has_store_access(store_id)
      and public.current_user_has_role_slug('sales_manager')
    )
  );

-- deal_fni_products: piggyback on parent deal's permissions
create policy "deal_fni_products read via parent"
  on public.deal_fni_products for select to authenticated
  using (
    exists (
      select 1 from public.deals d
      where d.id = deal_id
        and public.current_user_has_store_access(d.store_id)
    )
  );

create policy "deal_fni_products write via parent"
  on public.deal_fni_products for all to authenticated
  using (public.current_user_can_edit_deal(deal_id))
  with check (public.current_user_can_edit_deal(deal_id));
