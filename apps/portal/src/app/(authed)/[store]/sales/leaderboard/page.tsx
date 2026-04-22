import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader, cn } from '@pe/ui';
import { requireUserContext, getLandingPath } from '@pe/auth';
import { createClient } from '@pe/database/server';
import { MonthYearPicker } from '@/components/month-year-picker';

export const metadata: Metadata = { title: 'Leaderboard' };

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

interface LeaderRow {
  userId: string;
  name: string;
  units: number;
  pga: number;
  deals: number;
  isMe: boolean;
}

interface LeaderboardPageProps {
  params: { store: string };
  searchParams: { year?: string; month?: string };
}

export default async function LeaderboardPage({ params, searchParams }: LeaderboardPageProps) {
  noStore();
  const ctx = await requireUserContext();
  const store = ctx.stores.find((s) => s.slug === params.store);
  if (!store) redirect(getLandingPath(ctx));

  const isFni = ctx.role?.department === 'fni';
  if (!ctx.isAdmin && ctx.role?.department !== 'sales' && !isFni) {
    redirect(getLandingPath(ctx));
  }

  const now = new Date();
  const year = clampYear(Number(searchParams.year ?? now.getFullYear()));
  const month = clampMonth(Number(searchParams.month ?? now.getMonth() + 1));

  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonth = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const monthEnd = `${nextMonth.y}-${String(nextMonth.m).padStart(2, '0')}-01`;
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year + 1}-01-01`;

  const supabase = createClient();

  // One query for the whole year; aggregate both month and YTD in code.
  const { data: deals } = await supabase
    .from('deals')
    .select('deal_date, salesperson_user_id, unit_count, pga_total')
    .eq('store_id', store.id)
    .gte('deal_date', yearStart)
    .lt('deal_date', yearEnd);

  const salespersonIds = Array.from(
    new Set(
      (deals ?? [])
        .map((d) => d.salesperson_user_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const nameById = new Map<string, string>();
  if (salespersonIds.length > 0) {
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .in('id', salespersonIds);
    for (const u of users ?? []) {
      nameById.set(u.id, u.full_name ?? u.email ?? 'Unknown');
    }
  }

  function aggregate(predicate: (date: string) => boolean): LeaderRow[] {
    const byUser = new Map<string, { units: number; pga: number; deals: number }>();
    for (const d of deals ?? []) {
      if (!d.salesperson_user_id) continue;
      if (!predicate(d.deal_date)) continue;
      const cur = byUser.get(d.salesperson_user_id) ?? { units: 0, pga: 0, deals: 0 };
      cur.units += d.unit_count ?? 1;
      cur.pga += Number(d.pga_total ?? 0);
      cur.deals += 1;
      byUser.set(d.salesperson_user_id, cur);
    }
    return Array.from(byUser.entries())
      .map(([userId, v]) => ({
        userId,
        name: nameById.get(userId) ?? 'Unknown',
        units: v.units,
        pga: v.pga,
        deals: v.deals,
        isMe: userId === ctx.user.id,
      }))
      .sort((a, b) => b.pga - a.pga || b.units - a.units);
  }

  const monthRows = aggregate((d) => d >= monthStart && d < monthEnd);
  const yearRows = aggregate(() => true);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Leaderboard · ${store.name}`}
        description="Ranked by PG&A dollars, with units sold as the tiebreaker."
        actions={
          <div className="flex items-center gap-2">
            <MonthYearPicker
              basePath={`/${store.slug}/sales/leaderboard`}
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
        <BoardCard
          title={`${MONTHS[month - 1]} ${year}`}
          subtitle="Current month"
          rows={monthRows}
        />
        <BoardCard title={`${year} YTD`} subtitle="Year to date" rows={yearRows} />
      </div>
    </div>
  );
}

function BoardCard({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: LeaderRow[];
}) {
  const totalPga = rows.reduce((s, r) => s + r.pga, 0);
  const totalUnits = rows.reduce((s, r) => s + r.units, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </div>
        <CardDescription>
          {totalUnits} unit{totalUnits === 1 ? '' : 's'}
          {totalPga > 0 ? ` \u00b7 $${totalPga.toLocaleString()} PG&A` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No deals in this period yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b">
                  <th className="w-8 py-2 text-left font-semibold">#</th>
                  <th className="py-2 text-left font-semibold">Salesperson</th>
                  <th className="py-2 text-right font-semibold">Units</th>
                  <th className="py-2 text-right font-semibold">Deals</th>
                  <th className="py-2 text-right font-semibold">PG&A $</th>
                  <th className="py-2 text-right font-semibold">$ / Deal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r, idx) => {
                  const perDeal = r.deals > 0 ? r.pga / r.deals : 0;
                  return (
                    <tr
                      key={r.userId}
                      className={cn(r.isMe ? 'bg-store-50/40' : undefined)}
                    >
                      <td className="py-2 font-mono text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="py-2 font-medium">
                        {r.name}
                        {r.isMe ? (
                          <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                        ) : null}
                      </td>
                      <td className="py-2 text-right tabular-nums">{r.units}</td>
                      <td className="py-2 text-right tabular-nums">{r.deals}</td>
                      <td className="py-2 text-right font-semibold tabular-nums">
                        ${r.pga.toLocaleString()}
                      </td>
                      <td className="py-2 text-right tabular-nums text-muted-foreground">
                        ${Math.round(perDeal).toLocaleString()}
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
