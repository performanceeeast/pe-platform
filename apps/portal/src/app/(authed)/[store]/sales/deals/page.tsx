import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Button, PageHeader } from '@pe/ui';
import { requireUserContext, getLandingPath } from '@pe/auth';
import { createClient } from '@pe/database/server';
import { MonthYearPicker } from '@/components/month-year-picker';
import { DealList, type DealRow } from './deal-list';

export const metadata: Metadata = { title: 'Deals' };

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function clampMonth(n: number): number {
  if (!Number.isFinite(n)) return new Date().getMonth() + 1;
  return Math.min(12, Math.max(1, Math.trunc(n)));
}

function clampYear(n: number): number {
  if (!Number.isFinite(n)) return new Date().getFullYear();
  return Math.min(2100, Math.max(2020, Math.trunc(n)));
}

interface DealsPageProps {
  params: { store: string };
  searchParams: { year?: string; month?: string };
}

export default async function DealsListPage({ params, searchParams }: DealsPageProps) {
  noStore();
  const ctx = await requireUserContext();
  const store = ctx.stores.find((s) => s.slug === params.store);
  if (!store) redirect(getLandingPath(ctx));

  const isFni = ctx.role?.department === 'fni';
  if (!ctx.isAdmin && ctx.role?.department !== 'sales' && !isFni) {
    redirect(getLandingPath(ctx));
  }

  // Managers, F&I, and admins see every deal for the store. Salespeople only
  // see their own. Rank-driven rather than role-slug so future sales-lead
  // roles automatically inherit the wider view.
  const canSeeAllDeals =
    ctx.isAdmin ||
    ctx.role?.rank === 'owner' ||
    ctx.role?.rank === 'manager' ||
    isFni;

  const now = new Date();
  const year = clampYear(Number(searchParams.year ?? now.getFullYear()));
  const month = clampMonth(Number(searchParams.month ?? now.getMonth() + 1));
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonth = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const monthEnd = `${nextMonth.y}-${String(nextMonth.m).padStart(2, '0')}-01`;

  const supabase = createClient();

  let dealsQuery = supabase
    .from('deals')
    .select(
      'id, deal_date, deal_number, customer_name, stock_number, pga_total, status, salesperson_user_id, unit_type_id',
    )
    .eq('store_id', store.id)
    .gte('deal_date', monthStart)
    .lt('deal_date', monthEnd)
    .order('deal_date', { ascending: false });

  if (!canSeeAllDeals) {
    dealsQuery = dealsQuery.eq('salesperson_user_id', ctx.user.id);
  }

  const { data: deals } = await dealsQuery;

  // Batch lookups for salesperson names + unit type labels.
  const salespersonIds = Array.from(
    new Set(
      (deals ?? [])
        .map((d) => d.salesperson_user_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const unitTypeIds = Array.from(
    new Set(
      (deals ?? [])
        .map((d) => d.unit_type_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const [usersRes, unitTypesRes] = await Promise.all([
    salespersonIds.length > 0
      ? supabase
          .from('user_profiles')
          .select('id, full_name, email')
          .in('id', salespersonIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; email: string | null }> }),
    unitTypeIds.length > 0
      ? supabase.from('unit_types').select('id, label').in('id', unitTypeIds)
      : Promise.resolve({ data: [] as Array<{ id: string; label: string }> }),
  ]);

  const nameById = new Map<string, string>();
  for (const u of usersRes.data ?? []) {
    nameById.set(u.id, u.full_name ?? u.email ?? 'Unknown');
  }
  const unitTypeLabelById = new Map<string, string>();
  for (const ut of unitTypesRes.data ?? []) {
    unitTypeLabelById.set(ut.id, ut.label);
  }

  const rows: DealRow[] = (deals ?? []).map((d) => ({
    id: d.id,
    dealDate: d.deal_date,
    dealNumber: d.deal_number,
    customerName: d.customer_name,
    stockNumber: d.stock_number,
    pgaTotal: d.pga_total !== null ? Number(d.pga_total) : null,
    status: d.status,
    salespersonName: d.salesperson_user_id
      ? nameById.get(d.salesperson_user_id) ?? null
      : null,
    unitTypeLabel: d.unit_type_id
      ? unitTypeLabelById.get(d.unit_type_id) ?? null
      : null,
  }));

  const pendingFinance = rows.filter((r) => r.status === 'pending_finance').length;
  const totalPga = rows.reduce((sum, r) => sum + (r.pgaTotal ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={canSeeAllDeals ? `Deals · ${store.name}` : 'My deals'}
        description={`${MONTHS[month - 1]} ${year} \u00b7 ${rows.length} deal${rows.length === 1 ? '' : 's'}${totalPga > 0 ? ` \u00b7 $${totalPga.toLocaleString()} PG&A` : ''}${pendingFinance > 0 ? ` \u00b7 ${pendingFinance} awaiting finance` : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <MonthYearPicker
              basePath={`/${store.slug}/sales/deals`}
              year={year}
              month={month}
            />
            <Button asChild>
              <Link href={`/${store.slug}/sales/deals/new`}>Log a deal</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/${store.slug}/sales`}>Back</Link>
            </Button>
          </div>
        }
      />

      <div className="px-4 md:px-6">
        <DealList rows={rows} showSalesperson={canSeeAllDeals} storeSlug={store.slug} />
      </div>
    </div>
  );
}
