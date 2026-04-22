import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Button, PageHeader } from '@pe/ui';
import { requireUserContext, getLandingPath } from '@pe/auth';
import { createClient } from '@pe/database/server';
import { MonthYearPicker } from '@/components/month-year-picker';
import { TiersForm, type TierRow } from './tiers-form';

export const metadata: Metadata = { title: 'PG&A tiers' };

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

interface PgaPageProps {
  params: { store: string };
  searchParams: { year?: string; month?: string };
}

export default async function PgaSetupPage({ params, searchParams }: PgaPageProps) {
  noStore();
  const ctx = await requireUserContext();
  const store = ctx.stores.find((s) => s.slug === params.store);
  if (!store) redirect(getLandingPath(ctx));

  const now = new Date();
  const year = clampYear(Number(searchParams.year ?? now.getFullYear()));
  const month = clampMonth(Number(searchParams.month ?? now.getMonth() + 1));

  const supabase = createClient();

  const { data: existing } = await supabase
    .from('pga_tiers')
    .select('id, min_amount, max_amount, spiff_amount')
    .eq('store_id', store.id)
    .eq('year', year)
    .eq('month', month)
    .order('min_amount');

  const rows: TierRow[] = (existing ?? []).map((t) => ({
    id: t.id,
    minAmount: Number(t.min_amount),
    maxAmount: Number(t.max_amount),
    spiffAmount: Number(t.spiff_amount),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`PG&A tiers · ${store.name}`}
        description={`${MONTHS[month - 1]} ${year}`}
        actions={
          <div className="flex items-center gap-2">
            <MonthYearPicker
              basePath={`/${store.slug}/sales/setup/pga`}
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
        <TiersForm
          storeId={store.id}
          year={year}
          month={month}
          rows={rows}
        />
      </div>
    </div>
  );
}
