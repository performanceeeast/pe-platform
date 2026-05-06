import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Button, PageHeader } from '@pe/ui';
import { requireUserContext, getLandingPath } from '@pe/auth';
import { createClient } from '@pe/database/server';
import { hasAnyRole } from '@/lib/sales-access';
import { MonthYearPicker } from '@/components/month-year-picker';
import { AppointmentsTable, type AppointmentRow } from './appointments-table';
import { DailyCountsCard, type DailyCountRow } from './daily-counts-card';
import {
  TrafficCard,
  type SourceSummaryRow,
  type TrafficRow,
} from './traffic-card';

export const metadata: Metadata = { title: 'Internet sales' };

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const RECENT_TRAFFIC_LIMIT = 10;

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
  // Default new entries to today if today falls inside the chosen month, else
  // the first of the chosen month so the date is always within the visible window.
  const defaultDate =
    todayISO >= monthStart && todayISO < monthEnd ? todayISO : monthStart;

  const supabase = createClient();

  const [
    { data: appts },
    { data: counts },
    { data: traffic },
    { data: leadSources },
    { data: salespeople },
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
      .from('traffic_log')
      .select(
        'id, traffic_date, customer_name, lead_source_id, salesperson_user_id, notes',
      )
      .eq('store_id', store.id)
      .gte('traffic_date', monthStart)
      .lt('traffic_date', monthEnd)
      .order('traffic_date', { ascending: false }),
    supabase
      .from('lead_sources')
      .select('id, label, sort_order')
      .eq('store_id', store.id)
      .eq('active', true)
      .order('sort_order'),
    // Pull anyone with sales-department role assignment for the dropdowns.
    // Fallback: also include user_role_grants for sales roles (Cedar Point's
    // dual-hatted manager). Keep simple: filter to active profiles with a
    // sales-department primary role; admins can still set it manually later.
    supabase
      .from('user_profiles')
      .select('id, full_name, email, role:roles!inner(department)')
      .eq('active', true)
      .eq('role.department', 'sales')
      .order('full_name'),
  ]);

  // Resolve salesperson names that appear in rows but might not be in the
  // active "sales department" list above (e.g. sales reps that moved roles).
  const userIds = new Set<string>();
  for (const a of appts ?? []) if (a.salesperson_user_id) userIds.add(a.salesperson_user_id);
  for (const t of traffic ?? []) if (t.salesperson_user_id) userIds.add(t.salesperson_user_id);
  for (const sp of salespeople ?? []) userIds.add(sp.id);

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

  // Traffic source breakdown: count from traffic_log + appointments combined.
  const sourceCounts = new Map<string, { traffic: number; appts: number }>();
  for (const t of traffic ?? []) {
    if (!t.lead_source_id) continue;
    const cur = sourceCounts.get(t.lead_source_id) ?? { traffic: 0, appts: 0 };
    cur.traffic += 1;
    sourceCounts.set(t.lead_source_id, cur);
  }
  for (const a of appts ?? []) {
    if (!a.lead_source_id) continue;
    const cur = sourceCounts.get(a.lead_source_id) ?? { traffic: 0, appts: 0 };
    cur.appts += 1;
    sourceCounts.set(a.lead_source_id, cur);
  }

  const summaryRows: SourceSummaryRow[] = (leadSources ?? [])
    .map((ls) => {
      const v = sourceCounts.get(ls.id) ?? { traffic: 0, appts: 0 };
      return { id: ls.id, label: ls.label, traffic: v.traffic, appts: v.appts };
    })
    .filter((r) => r.traffic > 0 || r.appts > 0);

  const totalAppts = (appts ?? []).length;
  const keptAppts = (appts ?? []).filter((a) => a.kept).length;
  const soldAppts = (appts ?? []).filter((a) => a.sold).length;
  const totalLeads = (counts ?? []).reduce((s, c) => s + (c.total_leads ?? 0), 0);
  const totalTraffic = (traffic ?? []).length;

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

  const trafficRows: TrafficRow[] = (traffic ?? [])
    .slice(0, RECENT_TRAFFIC_LIMIT)
    .map((t) => ({
      id: t.id,
      trafficDate: t.traffic_date,
      customerName: t.customer_name,
      salespersonName: t.salesperson_user_id
        ? nameById.get(t.salesperson_user_id) ?? null
        : null,
      sourceLabel: t.lead_source_id ? sourceLabel.get(t.lead_source_id) ?? null : null,
      notes: t.notes,
    }));

  const salespersonOptions = (salespeople ?? []).map((sp) => ({
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
        description={`${monthLabel} · ${totalAppts} appt${totalAppts === 1 ? '' : 's'} · ${keptAppts} kept · ${soldAppts} sold · ${totalLeads} logged leads`}
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
        <TrafficCard
          storeId={store.id}
          defaultDate={defaultDate}
          summary={summaryRows}
          totalTraffic={totalTraffic}
          totalAppts={totalAppts}
          recent={trafficRows}
          salespeople={salespersonOptions}
          leadSources={leadSourceOptions}
        />
        <DailyCountsCard
          storeId={store.id}
          defaultDate={defaultDate}
          rows={countRows}
        />
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
