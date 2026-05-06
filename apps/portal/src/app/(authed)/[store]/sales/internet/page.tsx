import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Users } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
} from '@pe/ui';
import { requireUserContext, getLandingPath } from '@pe/auth';
import { createClient } from '@pe/database/server';
import { hasAnyRole, listSalespeople } from '@/lib/sales-access';
import { MonthYearPicker } from '@/components/month-year-picker';
import { AppointmentsTable, type AppointmentRow } from './appointments-table';
import { DailyCountsCard, type DailyCountRow } from './daily-counts-card';

export const metadata: Metadata = { title: 'Internet sales' };

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

export default async function InternetSalesPage({ params, searchParams }: PageProps) {
  noStore();
  const ctx = await requireUserContext();
  const store = ctx.stores.find((s) => s.slug === params.store);
  if (!store) redirect(getLandingPath(ctx));

  const allowed = await hasAnyRole(['internet_sales_manager', 'sales_manager']);
  if (!allowed) redirect(getLandingPath(ctx));

  const now = new Date();
  const year = clampYear(Number(searchParams.year ?? now.getFullYear()));
  const month = clampMonth(Number(searchParams.month ?? now.getMonth() + 1));
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonth = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const monthEnd = `${nextMonth.y}-${String(nextMonth.m).padStart(2, '0')}-01`;
  const todayISO = now.toISOString().slice(0, 10);
  const defaultDate =
    todayISO >= monthStart && todayISO < monthEnd ? todayISO : monthStart;

  const supabase = createClient();

  const [
    { data: appts },
    { data: counts },
    { data: leadSources },
    salespeople,
  ] = await Promise.all([
    supabase
      .from('appointments')
      .select(
        'id, appt_date, customer_name, unit_interested, kept, sold, salesperson_user_id, lead_source_id, notes',
      )
      .eq('store_id', store.id)
      .gte('appt_date', monthStart)
      .lt('appt_date', monthEnd)
      .order('appt_date', { ascending: false }),
    supabase
      .from('daily_lead_counts')
      .select('id, count_date, total_leads, notes')
      .eq('store_id', store.id)
      .gte('count_date', monthStart)
      .lt('count_date', monthEnd)
      .order('count_date', { ascending: false }),
    supabase
      .from('lead_sources')
      .select('id, label, sort_order')
      .eq('store_id', store.id)
      .eq('active', true)
      .order('sort_order'),
    listSalespeople(),
  ]);

  // Resolve names for any salesperson seen on appointments.
  const userIds = new Set<string>();
  for (const a of appts ?? []) if (a.salesperson_user_id) userIds.add(a.salesperson_user_id);
  for (const sp of salespeople) userIds.add(sp.id);

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

  const sourceLabel = new Map<string, string>();
  for (const ls of leadSources ?? []) sourceLabel.set(ls.id, ls.label);

  // Salesperson handoff performance: every appt the ISM books that gets
  // assigned to a salesperson is a handoff. Track kept / sold against assigned.
  const handoffByUser = new Map<string, { assigned: number; kept: number; sold: number }>();
  let unassigned = 0;
  for (const a of appts ?? []) {
    if (!a.salesperson_user_id) {
      unassigned += 1;
      continue;
    }
    const cur =
      handoffByUser.get(a.salesperson_user_id) ?? { assigned: 0, kept: 0, sold: 0 };
    cur.assigned += 1;
    if (a.kept) cur.kept += 1;
    if (a.sold) cur.sold += 1;
    handoffByUser.set(a.salesperson_user_id, cur);
  }
  const handoffRows = Array.from(handoffByUser.entries())
    .map(([userId, v]) => ({
      userId,
      name: nameById.get(userId) ?? 'Unknown',
      assigned: v.assigned,
      kept: v.kept,
      sold: v.sold,
      keepPct: v.assigned > 0 ? Math.round((v.kept / v.assigned) * 100) : 0,
      closePct: v.kept > 0 ? Math.round((v.sold / v.kept) * 100) : 0,
    }))
    .sort((a, b) => b.sold - a.sold || b.closePct - a.closePct);

  const totalAppts = (appts ?? []).length;
  const keptAppts = (appts ?? []).filter((a) => a.kept).length;
  const soldAppts = (appts ?? []).filter((a) => a.sold).length;
  const totalLeads = (counts ?? []).reduce((s, c) => s + (c.total_leads ?? 0), 0);

  const apptRows: AppointmentRow[] = (appts ?? []).map((a) => ({
    id: a.id,
    apptDate: a.appt_date,
    customerName: a.customer_name,
    unitInterested: a.unit_interested,
    kept: a.kept,
    sold: a.sold,
    salespersonUserId: a.salesperson_user_id,
    salespersonName: a.salesperson_user_id
      ? nameById.get(a.salesperson_user_id) ?? null
      : null,
    leadSourceId: a.lead_source_id,
    sourceLabel: a.lead_source_id ? sourceLabel.get(a.lead_source_id) ?? null : null,
    notes: a.notes,
  }));

  const countRows: DailyCountRow[] = (counts ?? []).map((c) => ({
    id: c.id,
    countDate: c.count_date,
    totalLeads: c.total_leads,
    notes: c.notes,
  }));

  const salespersonOptions = salespeople.map((sp) => ({
    id: sp.id,
    label: nameById.get(sp.id) ?? sp.full_name ?? sp.email ?? 'Unknown',
  }));
  const leadSourceOptions = (leadSources ?? []).map((ls) => ({
    id: ls.id,
    label: ls.label,
  }));

  const monthLabel = `${MONTHS[month - 1]} ${year}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Internet sales · ${store.name}`}
        description={`${monthLabel} · ${totalLeads} leads · ${totalAppts} appt${totalAppts === 1 ? '' : 's'} · ${keptAppts} kept · ${soldAppts} sold`}
        actions={
          <div className="flex items-center gap-2">
            <MonthYearPicker
              basePath={`/${store.slug}/sales/internet`}
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
        <DailyCountsCard
          storeId={store.id}
          defaultDate={defaultDate}
          rows={countRows}
        />
        <HandoffPerformanceCard rows={handoffRows} unassigned={unassigned} />
        <AppointmentsTable
          storeId={store.id}
          defaultDate={defaultDate}
          rows={apptRows}
          salespeople={salespersonOptions}
          leadSources={leadSourceOptions}
        />
      </div>
    </div>
  );
}

interface HandoffRow {
  userId: string;
  name: string;
  assigned: number;
  kept: number;
  sold: number;
  keepPct: number;
  closePct: number;
}

function HandoffPerformanceCard({
  rows,
  unassigned,
}: {
  rows: HandoffRow[];
  unassigned: number;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Salesperson handoff performance</CardTitle>
        </div>
        <CardDescription>
          How each rep performs on the appointments you hand off to them this
          month. Keep % = kept / assigned. Close % = sold / kept.
          {unassigned > 0
            ? ` ${unassigned} unassigned appt${unassigned === 1 ? '' : 's'}.`
            : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No appointments have been handed off to a salesperson yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 text-left font-semibold">Salesperson</th>
                  <th className="py-2 text-right font-semibold">Assigned</th>
                  <th className="py-2 text-right font-semibold">Kept</th>
                  <th className="py-2 text-right font-semibold">Sold</th>
                  <th className="py-2 text-right font-semibold">Keep %</th>
                  <th className="py-2 text-right font-semibold">Close %</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.userId}>
                    <td className="py-2 font-medium">{r.name}</td>
                    <td className="py-2 text-right tabular-nums">{r.assigned}</td>
                    <td className="py-2 text-right tabular-nums">{r.kept}</td>
                    <td className="py-2 text-right tabular-nums">{r.sold}</td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">
                      {r.keepPct}%
                    </td>
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
