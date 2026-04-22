import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Button, PageHeader } from '@pe/ui';
import { requireUserContext, getLandingPath } from '@pe/auth';
import { createClient } from '@pe/database/server';
import { MonthYearPicker } from '@/components/month-year-picker';
import { ContestsForm, type ContestRow, type SalespersonOption } from './contests-form';

export const metadata: Metadata = { title: 'Contests' };

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

interface ContestsPageProps {
  params: { store: string };
  searchParams: { year?: string; month?: string };
}

export default async function ContestsSetupPage({
  params,
  searchParams,
}: ContestsPageProps) {
  noStore();
  const ctx = await requireUserContext();
  const store = ctx.stores.find((s) => s.slug === params.store);
  if (!store) redirect(getLandingPath(ctx));

  const now = new Date();
  const year = clampYear(Number(searchParams.year ?? now.getFullYear()));
  const month = clampMonth(Number(searchParams.month ?? now.getMonth() + 1));

  const supabase = createClient();

  const { data: contests } = await supabase
    .from('contests')
    .select('id, name, description, prize, winner_user_id, created_at')
    .eq('store_id', store.id)
    .eq('year', year)
    .eq('month', month)
    .order('created_at');

  // Salespeople eligible as winners: anyone active with store access.
  const { data: accessRows } = await supabase
    .from('user_store_access')
    .select('user_id')
    .eq('store_id', store.id);

  const userIds = (accessRows ?? []).map((r) => r.user_id);
  const { data: users } = userIds.length
    ? await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .in('id', userIds)
        .eq('active', true)
        .order('full_name', { nullsFirst: false })
    : { data: [] };

  const salespeople: SalespersonOption[] = (users ?? []).map((u) => ({
    id: u.id,
    label: u.full_name ?? u.email ?? 'Unknown',
  }));

  const rows: ContestRow[] = (contests ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description ?? '',
    prize: c.prize ?? '',
    winnerUserId: c.winner_user_id,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Contests · ${store.name}`}
        description={`${MONTHS[month - 1]} ${year}`}
        actions={
          <div className="flex items-center gap-2">
            <MonthYearPicker
              basePath={`/${store.slug}/sales/setup/contests`}
              year={year}
              month={month}
            />
            <Button asChild variant="outline">
              <Link href={`/${store.slug}/sales/setup`}>Back to setup</Link>
            </Button>
          </div>
        }
      />

      <div className="px-4 md:px-6">
        <ContestsForm
          storeId={store.id}
          year={year}
          month={month}
          rows={rows}
          salespeople={salespeople}
        />
      </div>
    </div>
  );
}
