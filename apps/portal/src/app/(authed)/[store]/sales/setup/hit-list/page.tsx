import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Button, PageHeader } from '@pe/ui';
import { requireUserContext, getLandingPath } from '@pe/auth';
import { createClient } from '@pe/database/server';
import { HitListForm, type HitListRow, type SalespersonOption } from './hit-list-form';

export const metadata: Metadata = { title: 'Hit list' };

interface HitListPageProps {
  params: { store: string };
}

export default async function HitListSetupPage({ params }: HitListPageProps) {
  noStore();
  const ctx = await requireUserContext();
  const store = ctx.stores.find((s) => s.slug === params.store);
  if (!store) redirect(getLandingPath(ctx));

  const supabase = createClient();

  const { data: items } = await supabase
    .from('aged_inventory')
    .select('id, stock_number, description, date_in_stock, spiff_amount, sold_by_user_id, sold_at, notes')
    .eq('store_id', store.id)
    .order('date_in_stock', { ascending: true, nullsFirst: false });

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

  const rows: HitListRow[] = (items ?? []).map((i) => ({
    id: i.id,
    stockNumber: i.stock_number,
    description: i.description ?? '',
    dateInStock: i.date_in_stock ?? '',
    spiffAmount: Number(i.spiff_amount),
    soldByUserId: i.sold_by_user_id,
    soldAt: i.sold_at ?? '',
    notes: i.notes ?? '',
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hit list · ${store.name}`}
        description="Aged inventory with optional per-unit spiff. Mark sold by filling the Sold-by and Sold-on fields."
        actions={
          <Button asChild variant="outline">
            <Link href={`/${store.slug}/sales/setup`}>Back to setup</Link>
          </Button>
        }
      />

      <div className="px-4 md:px-6">
        <HitListForm storeId={store.id} rows={rows} salespeople={salespeople} />
      </div>
    </div>
  );
}
