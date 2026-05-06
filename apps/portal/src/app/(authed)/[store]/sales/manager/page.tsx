import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { AlertTriangle, Layers, Percent } from 'lucide-react';
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

export const metadata: Metadata = { title: 'Sales pipeline' };

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type DealStatus =
  | 'pending_finance'
  | 'pending_salesperson'
  | 'complete'
  | 'delivered';

const STATUS_LABEL: Record<DealStatus, string> = {
  pending_finance: 'Awaiting finance',
  pending_salesperson: 'Missing front-end',
  complete: 'Complete',
  delivered: 'Delivered',
};

const STATUS_CLASS: Record<DealStatus, string> = {
  pending_finance: 'bg-amber-100 text-amber-900',
  pending_salesperson: 'bg-amber-100 text-amber-900',
  complete: 'bg-blue-100 text-blue-900',
  delivered: 'bg-green-100 text-green-900',
};

const AGED_DAYS = 5;

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

export default async function SalesManagerPage({ params, searchParams }: PageProps) {
  noStore();
  const ctx = await requireUserContext();
  const store = ctx.stores.find((s) => s.slug === params.store);
  if (!store) redirect(getLandingPath(ctx));

  const allowed = await hasAnyRole(['sales_manager']);
  if (!allowed) redirect(getLandingPath(ctx));

  const now = new Date();
  const year = clampYear(Number(searchParams.year ?? now.getFullYear()));
  const month = clampMonth(Number(searchParams.month ?? now.getMonth() + 1));
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonth = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const monthEnd = `${nextMonth.y}-${String(nextMonth.m).padStart(2, '0')}-01`;

  const agedCutoff = new Date(now);
  agedCutoff.setDate(agedCutoff.getDate() - AGED_DAYS);
  const agedCutoffISO = agedCutoff.toISOString().slice(0, 10);

  const supabase = createClient();

  const [{ data: deals }, { data: appts }] = await Promise.all([
    supabase
      .from('deals')
      .select('id, deal_date, deal_number, customer_name, status, salesperson_user_id, pga_total')
      .eq('store_id', store.id)
      .gte('deal_date', monthStart)
      .lt('deal_date', monthEnd),
    supabase
      .from('appointments')
      .select('salesperson_user_id, kept, sold')
      .eq('store_id', store.id)
      .gte('appt_date', monthStart)
      .lt('appt_date', monthEnd),
  ]);

  // Pipeline counts by status.
  const pipeline: Record<DealStatus, number> = {
    pending_finance: 0,
    pending_salesperson: 0,
    complete: 0,
    delivered: 0,
  };
  for (const d of deals ?? []) {
    pipeline[d.status as DealStatus] += 1;
  }
  const totalDeals = (deals ?? []).length;

  // Aged deals: not delivered and deal_date older than the cutoff.
  const agedDeals = (deals ?? [])
    .filter((d) => d.status !== 'delivered' && d.deal_date <= agedCutoffISO)
    .sort((a, b) => a.deal_date.localeCompare(b.deal_date));

  // Closing %: kept appts vs sold appts per salesperson.
  const apptByUser = new Map<string, { kept: number; sold: number; total: number }>();
  for (const a of appts ?? []) {
    if (!a.salesperson_user_id) continue;
    const cur = apptByUser.get(a.salesperson_user_id) ?? { kept: 0, sold: 0, total: 0 };
    cur.total += 1;
    if (a.kept) cur.kept += 1;
    if (a.sold) cur.sold += 1;
    apptByUser.set(a.salesperson_user_id, cur);
  }

  const userIds = new Set<string>();
  for (const d of agedDeals) if (d.salesperson_user_id) userIds.add(d.salesperson_user_id);
  for (const id of apptByUser.keys()) userIds.add(id);

  const nameById = new Map<string, string>();
  if (userIds.size > 0) {
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .in('id', Array.from(userIds));
    for (const u of users ?? []) {
      nameById.set(u.id, u.full_name ?? u.email ?? 'Unknown');
    }
  }

  const closingRows = Array.from(apptByUser.entries())
    .map(([userId, v]) => ({
      userId,
      name: nameById.get(userId) ?? 'Unknown',
      kept: v.kept,
      sold: v.sold,
      total: v.total,
      closePct: v.kept > 0 ? Math.round((v.sold / v.kept) * 100) : 0,
    }))
    .sort((a, b) => b.closePct - a.closePct || b.sold - a.sold);

  const monthLabel = `${MONTHS[month - 1]} ${year}`;
  const totalKept = closingRows.reduce((s, r) => s + r.kept, 0);
  const totalSold = closingRows.reduce((s, r) => s + r.sold, 0);
  const overallClose = totalKept > 0 ? Math.round((totalSold / totalKept) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Pipeline · ${store.name}`}
        description={`${monthLabel} · ${totalDeals} deal${totalDeals === 1 ? '' : 's'} · ${agedDeals.length} aged > ${AGED_DAYS}d · ${overallClose}% close`}
        actions={
          <div className="flex items-center gap-2">
            <MonthYearPicker
              basePath={`/${store.slug}/sales/manager`}
              year={year}
              month={month}
            />
            <Button asChild variant="outline">
              <Link href={`/${store.slug}/sales`}>Back</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 px-4 md:px-6 lg:grid-cols-2">
        <PipelineCard pipeline={pipeline} total={totalDeals} />
        <ClosingCard rows={closingRows} overall={overallClose} />
        <AgedDealsCard
          rows={agedDeals.map((d) => ({
            id: d.id,
            dealDate: d.deal_date,
            dealNumber: d.deal_number,
            customerName: d.customer_name,
            status: d.status as DealStatus,
            salespersonName: d.salesperson_user_id
              ? nameById.get(d.salesperson_user_id) ?? null
              : null,
            ageDays: daysBetween(d.deal_date, now),
          }))}
          storeSlug={store.slug}
        />
      </div>
    </div>
  );
}

function daysBetween(iso: string, now: Date): number {
  const then = new Date(`${iso}T00:00:00Z`);
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.round((todayUTC - then.getTime()) / (1000 * 60 * 60 * 24)));
}

function PipelineCard({
  pipeline,
  total,
}: {
  pipeline: Record<DealStatus, number>;
  total: number;
}) {
  const order: DealStatus[] = [
    'pending_salesperson',
    'pending_finance',
    'complete',
    'delivered',
  ];
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Pipeline by stage</CardTitle>
        </div>
        <CardDescription>Where every deal sits this month.</CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">No deals yet this month.</p>
        ) : (
          <ul className="space-y-3">
            {order.map((status) => {
              const count = pipeline[status];
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <li key={status} className="space-y-1">
                  <div className="flex items-baseline justify-between text-sm">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                        STATUS_CLASS[status],
                      )}
                    >
                      {STATUS_LABEL[status]}
                    </span>
                    <span className="tabular-nums">
                      <span className="font-semibold">{count}</span>
                      <span className="ml-1 text-xs text-muted-foreground">
                        {pct}%
                      </span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-store-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

interface ClosingRow {
  userId: string;
  name: string;
  kept: number;
  sold: number;
  total: number;
  closePct: number;
}

function ClosingCard({ rows, overall }: { rows: ClosingRow[]; overall: number }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Percent className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Closing % by salesperson</CardTitle>
        </div>
        <CardDescription>
          Sold &divide; kept appointments. Store overall: {overall}%.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No appointments logged this month yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 text-left font-semibold">Salesperson</th>
                  <th className="py-2 text-right font-semibold">Appts</th>
                  <th className="py-2 text-right font-semibold">Kept</th>
                  <th className="py-2 text-right font-semibold">Sold</th>
                  <th className="py-2 text-right font-semibold">Close %</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.userId}>
                    <td className="py-2 font-medium">{r.name}</td>
                    <td className="py-2 text-right tabular-nums">{r.total}</td>
                    <td className="py-2 text-right tabular-nums">{r.kept}</td>
                    <td className="py-2 text-right tabular-nums">{r.sold}</td>
                    <td className="py-2 text-right font-semibold tabular-nums">
                      {r.closePct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AgedDealRow {
  id: string;
  dealDate: string;
  dealNumber: string | null;
  customerName: string;
  status: DealStatus;
  salespersonName: string | null;
  ageDays: number;
}

function AgedDealsCard({
  rows,
  storeSlug,
}: {
  rows: AgedDealRow[];
  storeSlug: string;
}) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">
            Aged deals &gt; {AGED_DAYS} days
          </CardTitle>
        </div>
        <CardDescription>
          Open deals (not yet delivered) sitting longer than {AGED_DAYS} days.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing aging right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 text-left font-semibold">Date</th>
                  <th className="py-2 text-left font-semibold">Deal #</th>
                  <th className="py-2 text-left font-semibold">Customer</th>
                  <th className="py-2 text-left font-semibold">Salesperson</th>
                  <th className="py-2 text-left font-semibold">Status</th>
                  <th className="py-2 text-right font-semibold">Age</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => {
                  const href = `/${storeSlug}/sales/deals/${r.id}`;
                  return (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="py-2 tabular-nums">{r.dealDate}</td>
                      <td className="py-2 font-mono">
                        <Link href={href} className="hover:underline">
                          {r.dealNumber ?? '—'}
                        </Link>
                      </td>
                      <td className="py-2 font-medium">
                        <Link href={href} className="hover:underline">
                          {r.customerName}
                        </Link>
                      </td>
                      <td className="py-2">{r.salespersonName ?? '—'}</td>
                      <td className="py-2">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                            STATUS_CLASS[r.status],
                          )}
                        >
                          {STATUS_LABEL[r.status]}
                        </span>
                      </td>
                      <td className="py-2 text-right font-semibold tabular-nums">
                        {r.ageDays}d
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
