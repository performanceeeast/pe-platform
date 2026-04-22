import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Button, PageHeader } from '@pe/ui';
import { requireUserContext, getLandingPath } from '@pe/auth';
import { createClient } from '@pe/database/server';
import { MonthYearPicker } from '@/components/month-year-picker';
import { SpiffsForm, type SpiffRow } from './spiffs-form';

export const metadata: Metadata = { title: 'Back-end spiffs' };

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

interface SpiffsPageProps {
  params: { store: string };
  searchParams: { year?: string; month?: string };
}

export default async function SpiffsSetupPage({ params, searchParams }: SpiffsPageProps) {
  noStore();
  const ctx = await requireUserContext();
  const store = ctx.stores.find((s) => s.slug === params.store);
  if (!store) redirect(getLandingPath(ctx));

  const now = new Date();
  const year = clampYear(Number(searchParams.year ?? now.getFullYear()));
  const month = clampMonth(Number(searchParams.month ?? now.getMonth() + 1));

  const supabase = createClient();

  const { data: products, error: productsError } = await supabase
    .from('fni_products')
    .select('id, slug, label, sort_order')
    .eq('store_id', store.id)
    .eq('active', true)
    .order('sort_order');

  if (productsError) notFound();

  const { data: existing } = await supabase
    .from('be_spiffs')
    .select('id, fni_product_id, amount, all_products_bonus')
    .eq('store_id', store.id)
    .eq('year', year)
    .eq('month', month);

  const byProduct = new Map(
    (existing ?? []).map((row) => [row.fni_product_id, row]),
  );

  const rows: SpiffRow[] = (products ?? []).map((p) => {
    const r = byProduct.get(p.id);
    return {
      fniProductId: p.id,
      label: p.label,
      amount: r?.amount ?? 0,
    };
  });

  // all_products_bonus is per-month, stored (currently) on every row — take
  // whichever value is present, default to 0 for unconfigured months.
  const allProductsBonus = existing?.[0]?.all_products_bonus ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Back-end spiffs · ${store.name}`}
        description={`${MONTHS[month - 1]} ${year}`}
        actions={
          <div className="flex items-center gap-2">
            <MonthYearPicker
              basePath={`/${store.slug}/sales/setup/spiffs`}
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
        <SpiffsForm
          storeId={store.id}
          year={year}
          month={month}
          rows={rows}
          allProductsBonus={allProductsBonus}
        />
      </div>
    </div>
  );
}
