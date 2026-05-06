import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Calendar, ListChecks, Radio } from 'lucide-react';
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

  const supabase = createClient();

  const [{ data: appts }, { data: counts }, { data: traffic }, { data: leadSources }] =
    await Promise.all([
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
        .select('id, traffic_date, lead_source_id, salesperson_user_id')
        .eq('store_id', store.id)
        .gte('traffic_date', monthStart)
        .lt('traffic_date', monthEnd),
      supabase
        .from('lead_sources')
        .select('id, label, sort_order')
        .eq('store_id', store.id)
        .eq('active', true)
        .order('sort_order'),
    ]);

  // Resolve salesperson names for appointment rows.
  const userIds = new Set<string>();
  for (const a of appts ?? []) if (a.salesperson_user_id) userIds.add(a.salesperson_user_id);

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

  const sourceRows = (leadSources ?? [])
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
        <TrafficSourceCard rows={sourceRows} totalTraffic={totalTraffic} totalAppts={totalAppts} />
        <DailyLeadCountsCard
          rows={(counts ?? []).map((c) => ({
            id: c.id,
            countDate: c.count_date,
            totalLeads: c.total_leads,
            notes: c.notes,
          }))}
        />
        <AppointmentsCard
          rows={(appts ?? []).map((a) => ({
            id: a.id,
            apptDate: a.appt_date,
            customerName: a.customer_name,
            unitInterested: a.unit_interested,
            kept: a.kept,
            sold: a.sold,
            salespersonName: a.salesperson_user_id
              ? nameById.get(a.salesperson_user_id) ?? null
              : null,
            sourceLabel: a.lead_source_id ? sourceLabel.get(a.lead_source_id) ?? null : null,
            notes: a.notes,
          }))}
        />
      </div>
    </div>
  );
}

interface SourceRow {
  id: string;
  label: string;
  traffic: number;
  appts: number;
}

function TrafficSourceCard({
  rows,
  totalTraffic,
  totalAppts,
}: {
  rows: SourceRow[];
  totalTraffic: number;
  totalAppts: number;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Traffic by source</CardTitle>
        </div>
        <CardDescription>
          Walk-in / phone log + appointments grouped by where the lead came from.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tagged traffic or appointments this month.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 text-left font-semibold">Source</th>
                  <th className="py-2 text-right font-semibold">Traffic</th>
                  <th className="py-2 text-right font-semibold">Appts</th>
                  <th className="py-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 font-medium">{r.label}</td>
                    <td className="py-2 text-right tabular-nums">{r.traffic}</td>
                    <td className="py-2 text-right tabular-nums">{r.appts}</td>
                    <td className="py-2 text-right font-semibold tabular-nums">
                      {r.traffic + r.appts}
                    </td>
                  </tr>
                ))}
                <tr className="border-t bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                  <td className="py-2 font-semibold">Total</td>
                  <td className="py-2 text-right tabular-nums">{totalTraffic}</td>
                  <td className="py-2 text-right tabular-nums">{totalAppts}</td>
                  <td className="py-2 text-right font-semibold tabular-nums">
                    {totalTraffic + totalAppts}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CountRow {
  id: string;
  countDate: string;
  totalLeads: number;
  notes: string | null;
}

function DailyLeadCountsCard({ rows }: { rows: CountRow[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Daily lead counts</CardTitle>
        </div>
        <CardDescription>
          Roll-up totals when per-lead detail isn&rsquo;t worth logging.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No daily counts logged for this month.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 text-left font-semibold">Date</th>
                  <th className="py-2 text-right font-semibold">Leads</th>
                  <th className="py-2 text-left font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 tabular-nums">{r.countDate}</td>
                    <td className="py-2 text-right font-semibold tabular-nums">
                      {r.totalLeads}
                    </td>
                    <td className="py-2 text-muted-foreground">{r.notes ?? '—'}</td>
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

interface ApptRow {
  id: string;
  apptDate: string;
  customerName: string;
  unitInterested: string | null;
  kept: boolean;
  sold: boolean;
  salespersonName: string | null;
  sourceLabel: string | null;
  notes: string | null;
}

function AppointmentsCard({ rows }: { rows: ApptRow[] }) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Appointment log</CardTitle>
        </div>
        <CardDescription>Every scheduled appointment for the month.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No appointments scheduled this month.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 text-left font-semibold">Date</th>
                  <th className="py-2 text-left font-semibold">Customer</th>
                  <th className="py-2 text-left font-semibold">Unit</th>
                  <th className="py-2 text-left font-semibold">Salesperson</th>
                  <th className="py-2 text-left font-semibold">Source</th>
                  <th className="py-2 text-left font-semibold">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="py-2 tabular-nums">{r.apptDate}</td>
                    <td className="py-2 font-medium">{r.customerName}</td>
                    <td className="py-2">{r.unitInterested ?? '—'}</td>
                    <td className="py-2">{r.salespersonName ?? '—'}</td>
                    <td className="py-2">{r.sourceLabel ?? '—'}</td>
                    <td className="py-2">
                      <OutcomeBadges kept={r.kept} sold={r.sold} />
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

function OutcomeBadges({ kept, sold }: { kept: boolean; sold: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <Pill on={kept} label="Kept" onClass="bg-blue-100 text-blue-900" />
      <Pill on={sold} label="Sold" onClass="bg-green-100 text-green-900" />
    </div>
  );
}

function Pill({ on, label, onClass }: { on: boolean; label: string; onClass: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
        on ? onClass : 'bg-muted text-muted-foreground',
      )}
    >
      {label}
    </span>
  );
}
