import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { DollarSign, Package, Percent, Target } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  cn,
} from '@pe/ui';
import { requireUserContext, getLandingPath } from '@pe/auth';
import { createClient } from '@pe/database/server';
import { hasAnyRole } from '@/lib/sales-access';
import { MonthYearPicker } from '@/components/month-year-picker';

export const metadata: Metadata = { title: 'F&I' };

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

interface PageProps {
  params: { store: string };
  searchParams: { year?: string; month?: string };
}

export default async function FniDashboardPage({ params, searchParams }: PageProps) {
  noStore();
  const ctx = await requireUserContext();
  const store = ctx.stores.find((s) => s.slug === params.store);
  if (!store) redirect(getLandingPath(ctx));

  // F&I managers see their own dashboard. Sales managers and admins also have
  // visibility (Cedar Point's manager wears both hats; admins see everything).
  const allowed = await hasAnyRole(['fni_manager', 'sales_manager']);
  if (!allowed) redirect(getLandingPath(ctx));

  const now = new Date();
  const year = clampYear(Number(searchParams.year ?? now.getFullYear()));
  const month = clampMonth(Number(searchParams.month ?? now.getMonth() + 1));
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonth = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const monthEnd = `${nextMonth.y}-${String(nextMonth.m).padStart(2, '0')}-01`;

  const supabase = createClient();

  const [{ data: deals }, { data: products }, { data: goals }] = await Promise.all([
    supabase
      .from('deals')
      .select('id, unit_count, back_end_total, finance_reserve')
      .eq('store_id', store.id)
      .gte('deal_date', monthStart)
      .lt('deal_date', monthEnd),
    supabase
      .from('fni_products')
      .select('id, slug, label, sort_order')
      .eq('store_id', store.id)
      .eq('active', true)
      .order('sort_order'),
    supabase
      .from('sales_goals')
      .select('unit_type_id, target, stretch')
      .eq('store_id', store.id)
      .eq('year', year)
      .eq('month', month),
  ]);

  const dealIds = (deals ?? []).map((d) => d.id);
  const dealCount = dealIds.length;
  const totalUnits = (deals ?? []).reduce((s, d) => s + (d.unit_count ?? 1), 0);
  const totalBackEnd = (deals ?? []).reduce(
    (s, d) => s + Number(d.back_end_total ?? 0),
    0,
  );
  const totalReserve = (deals ?? []).reduce(
    (s, d) => s + Number(d.finance_reserve ?? 0),
    0,
  );
  // PVR = back-end revenue per unit moved. Reserve folded in since it's part
  // of F&I's gross.
  const pvr = totalUnits > 0 ? (totalBackEnd + totalReserve) / totalUnits : 0;

  // Pull the join rows scoped to this month's deals so we can compute
  // penetration + products-per-deal without dragging the whole join table.
  const { data: joinRows } = dealIds.length
    ? await supabase
        .from('deal_fni_products')
        .select('deal_id, fni_product_id')
        .in('deal_id', dealIds)
    : { data: [] as Array<{ deal_id: string; fni_product_id: string }> };

  const productCount = new Map<string, number>();
  for (const row of joinRows ?? []) {
    productCount.set(
      row.fni_product_id,
      (productCount.get(row.fni_product_id) ?? 0) + 1,
    );
  }
  const productsPerDeal = dealCount > 0 ? (joinRows ?? []).length / dealCount : 0;

  const penetrationRows = (products ?? []).map((p) => {
    const count = productCount.get(p.id) ?? 0;
    return {
      id: p.id,
      label: p.label,
      count,
      pct: dealCount > 0 ? Math.round((count / dealCount) * 100) : 0,
    };
  });

  // MTD vs goal: F&I doesn't get its own units goal — they ride the sales
  // department's total target. Sum target/stretch across all unit types and
  // compare to delivered units.
  const totalTarget = (goals ?? []).reduce((s, g) => s + Number(g.target ?? 0), 0);
  const totalStretch = (goals ?? []).reduce((s, g) => s + Number(g.stretch ?? 0), 0);

  const monthLabel = `${MONTHS[month - 1]} ${year}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`F&I · ${store.name}`}
        description={`${monthLabel} · ${dealCount} deal${dealCount === 1 ? '' : 's'} · ${totalUnits} unit${totalUnits === 1 ? '' : 's'} · $${Math.round(pvr).toLocaleString()} PVR`}
        actions={
          <div className="flex items-center gap-2">
            <MonthYearPicker
              basePath={`/${store.slug}/fni`}
              year={year}
              month={month}
            />
            <Button asChild variant="outline">
              <Link href={`/${store.slug}/sales`}>Sales</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 px-4 md:px-6 lg:grid-cols-3">
        <KpiCard
          icon={DollarSign}
          label="Back-end + reserve"
          value={`$${Math.round(totalBackEnd + totalReserve).toLocaleString()}`}
          sub={`Back-end $${Math.round(totalBackEnd).toLocaleString()} · Reserve $${Math.round(totalReserve).toLocaleString()}`}
        />
        <KpiCard
          icon={Package}
          label="Products / deal"
          value={productsPerDeal.toFixed(2)}
          sub={`${(joinRows ?? []).length} products on ${dealCount} deal${dealCount === 1 ? '' : 's'}`}
        />
        <KpiCard
          icon={DollarSign}
          label="PVR"
          value={`$${Math.round(pvr).toLocaleString()}`}
          sub={`Per-unit gross across ${totalUnits} unit${totalUnits === 1 ? '' : 's'}`}
        />
      </div>

      <div className="grid gap-4 px-4 md:px-6 lg:grid-cols-2">
        <PenetrationCard rows={penetrationRows} dealCount={dealCount} />
        <GoalCard
          delivered={totalUnits}
          target={totalTarget}
          stretch={totalStretch}
          monthLabel={monthLabel}
        />
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

interface PenetrationRow {
  id: string;
  label: string;
  count: number;
  pct: number;
}

function PenetrationCard({
  rows,
  dealCount,
}: {
  rows: PenetrationRow[];
  dealCount: number;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Percent className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Penetration by product</CardTitle>
        </div>
        <CardDescription>
          Share of this month&rsquo;s deals that included each product.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {dealCount === 0 ? (
          <p className="text-sm text-muted-foreground">No deals yet this month.</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No F&I products configured for this store.
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id} className="space-y-1">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{r.label}</span>
                  <span className="tabular-nums">
                    <span className="font-semibold">{r.pct}%</span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      {r.count} / {dealCount}
                    </span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      r.pct >= 75 ? 'bg-green-500' : r.pct >= 50 ? 'bg-blue-500' : 'bg-store-500',
                    )}
                    style={{ width: `${r.pct}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function GoalCard({
  delivered,
  target,
  stretch,
  monthLabel,
}: {
  delivered: number;
  target: number;
  stretch: number;
  monthLabel: string;
}) {
  const denom = stretch > 0 ? stretch : Math.max(target, 1);
  const pct = Math.min(100, Math.round((delivered / denom) * 100));
  const hitTarget = target > 0 && delivered >= target;
  const hitStretch = stretch > 0 && delivered >= stretch;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">MTD vs sales goal</CardTitle>
        </div>
        <CardDescription>
          Total units against the sales department&rsquo;s {monthLabel} target.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {target === 0 && stretch === 0 ? (
          <p className="text-sm text-muted-foreground">
            No sales goal set for {monthLabel}. Ask the Sales Manager to fill in
            unit-type targets in setup.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">Units delivered</span>
              <span className="tabular-nums">
                <span
                  className={cn(
                    'font-semibold',
                    hitStretch ? 'text-green-600' : hitTarget ? 'text-blue-600' : undefined,
                  )}
                >
                  {delivered}
                </span>
                <span className="text-muted-foreground">
                  {' '}/ {target}
                  {stretch > target ? ` · ${stretch}` : ''}
                </span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  hitStretch ? 'bg-green-500' : hitTarget ? 'bg-blue-500' : 'bg-store-500',
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {pct}% of {stretch > target ? 'stretch' : 'target'}.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
