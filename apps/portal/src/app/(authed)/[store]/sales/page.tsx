import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { FileText, Trophy, Target, TrendingUp } from 'lucide-react';
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
import { canManageSalesConfig } from '@/lib/sales-access';
import { promoPublicUrl } from '@/lib/promo-url';

export const metadata: Metadata = { title: 'Sales' };

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface SalesPageProps {
  params: { store: string };
}

export default async function SalesDeptPage({ params }: SalesPageProps) {
  noStore();
  const ctx = await requireUserContext();
  const store = ctx.stores.find((s) => s.slug === params.store);
  if (!store) redirect(getLandingPath(ctx));

  const isFni = ctx.role?.department === 'fni';
  if (!ctx.isAdmin && ctx.role?.department !== 'sales' && !isFni) {
    redirect(getLandingPath(ctx));
  }

  const canSetup = await canManageSalesConfig();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonth = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const monthEnd = `${nextMonth.y}-${String(nextMonth.m).padStart(2, '0')}-01`;
  const todayISO = now.toISOString().slice(0, 10);

  const supabase = createClient();

  const [
    { data: deals },
    { data: goals },
    { data: unitTypes },
    { data: contests },
    { data: promos },
  ] = await Promise.all([
    supabase
      .from('deals')
      .select('id, unit_type_id, unit_count, salesperson_user_id, pga_total')
      .eq('store_id', store.id)
      .gte('deal_date', monthStart)
      .lt('deal_date', monthEnd),
    supabase
      .from('sales_goals')
      .select('unit_type_id, target, stretch, payout, stretch_payout')
      .eq('store_id', store.id)
      .eq('year', year)
      .eq('month', month),
    supabase
      .from('unit_types')
      .select('id, label, sort_order')
      .eq('store_id', store.id)
      .eq('active', true)
      .order('sort_order'),
    supabase
      .from('contests')
      .select('id, name, description, prize, winner_user_id')
      .eq('store_id', store.id)
      .eq('year', year)
      .eq('month', month)
      .order('created_at'),
    supabase
      .from('promo_docs')
      .select('id, title, storage_path, effective_start, effective_end')
      .or(`store_id.eq.${store.id},store_id.is.null`)
      .order('effective_start', { ascending: false, nullsFirst: false })
      .limit(20),
  ]);

  // Resolve names for leaderboard + contest winners.
  const userIds = new Set<string>();
  for (const d of deals ?? []) {
    if (d.salesperson_user_id) userIds.add(d.salesperson_user_id);
  }
  for (const c of contests ?? []) {
    if (c.winner_user_id) userIds.add(c.winner_user_id);
  }
  const nameByUserId = new Map<string, string>();
  if (userIds.size > 0) {
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .in('id', Array.from(userIds));
    for (const u of users ?? []) {
      nameByUserId.set(u.id, u.full_name ?? u.email ?? 'Unknown');
    }
  }

  // Aggregate monthly units by unit type + salesperson.
  const unitsByType = new Map<string, number>();
  const unitsByPerson = new Map<string, number>();
  const pgaByPerson = new Map<string, number>();
  let totalUnits = 0;
  let totalPga = 0;
  for (const d of deals ?? []) {
    const n = d.unit_count ?? 1;
    totalUnits += n;
    totalPga += Number(d.pga_total ?? 0);
    if (d.unit_type_id) {
      unitsByType.set(d.unit_type_id, (unitsByType.get(d.unit_type_id) ?? 0) + n);
    }
    if (d.salesperson_user_id) {
      unitsByPerson.set(
        d.salesperson_user_id,
        (unitsByPerson.get(d.salesperson_user_id) ?? 0) + n,
      );
      pgaByPerson.set(
        d.salesperson_user_id,
        (pgaByPerson.get(d.salesperson_user_id) ?? 0) + Number(d.pga_total ?? 0),
      );
    }
  }

  const goalByUnitType = new Map(
    (goals ?? []).map((g) => [g.unit_type_id, g]),
  );

  const goalRows = (unitTypes ?? [])
    .map((ut) => {
      const g = goalByUnitType.get(ut.id);
      return {
        label: ut.label,
        target: Number(g?.target ?? 0),
        stretch: Number(g?.stretch ?? 0),
        actual: unitsByType.get(ut.id) ?? 0,
      };
    })
    .filter((g) => g.target > 0 || g.stretch > 0 || g.actual > 0);

  const leaderboard = Array.from(unitsByPerson.entries())
    .map(([userId, units]) => ({
      userId,
      name: nameByUserId.get(userId) ?? 'Unknown',
      units,
      pga: pgaByPerson.get(userId) ?? 0,
      isMe: userId === ctx.user.id,
    }))
    .sort((a, b) => b.units - a.units || b.pga - a.pga);

  const activePromos = (promos ?? []).filter(
    (p) => !p.effective_end || p.effective_end >= todayISO,
  );

  const monthLabel = `${MONTHS[month - 1]} ${year}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Sales · ${store.name}`}
        description={`${monthLabel} \u00b7 ${totalUnits} unit${totalUnits === 1 ? '' : 's'}${totalPga > 0 ? ` \u00b7 $${totalPga.toLocaleString()} PG&A` : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild>
              <Link href={`/${store.slug}/sales/deals/new`}>Log a deal</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/${store.slug}/sales/deals`}>Deals</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/${store.slug}/sales/leaderboard`}>Leaderboard</Link>
            </Button>
            {canSetup ? (
              <Button asChild variant="outline">
                <Link href={`/${store.slug}/sales/setup`}>Setup</Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 px-4 md:px-6 lg:grid-cols-2">
        <GoalProgressCard rows={goalRows} />
        <LeaderboardCard rows={leaderboard.slice(0, 10)} />
        <ContestsCard
          rows={(contests ?? []).map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            prize: c.prize,
            winnerName: c.winner_user_id
              ? nameByUserId.get(c.winner_user_id) ?? null
              : null,
          }))}
        />
        <PromosCard
          rows={activePromos.map((p) => ({
            id: p.id,
            title: p.title,
            publicUrl: promoPublicUrl(p.storage_path),
            effectiveStart: p.effective_start,
            effectiveEnd: p.effective_end,
          }))}
        />
      </div>
    </div>
  );
}

interface GoalRow {
  label: string;
  target: number;
  stretch: number;
  actual: number;
}

function GoalProgressCard({ rows }: { rows: GoalRow[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Goal progress</CardTitle>
        </div>
        <CardDescription>Actual vs target by unit type this month.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No goals or deals yet this month.
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => {
              const denom = r.stretch > 0 ? r.stretch : Math.max(r.target, 1);
              const pct = Math.min(100, Math.round((r.actual / denom) * 100));
              const hitTarget = r.target > 0 && r.actual >= r.target;
              const hitStretch = r.stretch > 0 && r.actual >= r.stretch;
              return (
                <li key={r.label} className="space-y-1">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium">{r.label}</span>
                    <span className="tabular-nums">
                      <span className={cn('font-semibold', hitStretch ? 'text-green-600' : hitTarget ? 'text-blue-600' : undefined)}>
                        {r.actual}
                      </span>
                      <span className="text-muted-foreground"> / {r.target}{r.stretch > r.target ? ` \u00b7 ${r.stretch}` : ''}</span>
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
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

interface LeaderRow {
  userId: string;
  name: string;
  units: number;
  pga: number;
  isMe: boolean;
}

function LeaderboardCard({ rows }: { rows: LeaderRow[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Leaderboard</CardTitle>
        </div>
        <CardDescription>Units sold this month, with PG&A as tiebreaker.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No deals logged yet this month.
          </p>
        ) : (
          <ol className="space-y-2">
            {rows.map((r, idx) => (
              <li
                key={r.userId}
                className={cn(
                  'flex items-baseline justify-between rounded-md border px-3 py-2 text-sm',
                  r.isMe ? 'border-store-500 bg-store-50/40' : '',
                )}
              >
                <div className="flex min-w-0 items-baseline gap-3">
                  <span className="w-6 shrink-0 text-center font-mono text-muted-foreground">
                    {idx + 1}
                  </span>
                  <span className="truncate font-medium">
                    {r.name}
                    {r.isMe ? (
                      <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                    ) : null}
                  </span>
                </div>
                <div className="shrink-0 tabular-nums">
                  <span className="font-semibold">{r.units}</span>
                  <span className="ml-1 text-muted-foreground">units</span>
                  {r.pga > 0 ? (
                    <span className="ml-3 text-xs text-muted-foreground">
                      ${r.pga.toLocaleString()}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

interface ContestItem {
  id: string;
  name: string;
  description: string | null;
  prize: string | null;
  winnerName: string | null;
}

function ContestsCard({ rows }: { rows: ContestItem[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Contests</CardTitle>
        </div>
        <CardDescription>This month&rsquo;s active contests.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contests this month.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((c) => (
              <li key={c.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{c.name}</span>
                  {c.prize ? (
                    <span className="shrink-0 text-xs text-muted-foreground">{c.prize}</span>
                  ) : null}
                </div>
                {c.description ? (
                  <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>
                ) : null}
                {c.winnerName ? (
                  <p className="mt-1 text-xs">
                    <Trophy className="mr-1 inline h-3 w-3 text-amber-500" />
                    <span className="font-medium">{c.winnerName}</span>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

interface PromoItem {
  id: string;
  title: string;
  publicUrl: string;
  effectiveStart: string | null;
  effectiveEnd: string | null;
}

function PromosCard({ rows }: { rows: PromoItem[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Active promos</CardTitle>
        </div>
        <CardDescription>Current rebate and financing docs.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active promos.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((p) => (
              <li key={p.id} className="flex items-baseline gap-2 text-sm">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <a
                  href={p.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate hover:underline"
                >
                  {p.title}
                </a>
                {p.effectiveEnd ? (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    thru {p.effectiveEnd}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
