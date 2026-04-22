import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Button, PageHeader } from '@pe/ui';
import { requireUserContext, getLandingPath } from '@pe/auth';
import { createClient } from '@pe/database/server';
import { HitListManager, type HitListRow } from './hit-list-manager';

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
    .order('sold_at', { ascending: false, nullsFirst: true })
    .order('date_in_stock', { ascending: true, nullsFirst: false });

  // Resolve sold-by names in one batched lookup.
  const soldUserIds = Array.from(
    new Set(
      (items ?? [])
        .map((i) => i.sold_by_user_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const nameByUserId = new Map<string, string>();
  if (soldUserIds.length > 0) {
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .in('id', soldUserIds);
    for (const u of users ?? []) {
      nameByUserId.set(u.id, u.full_name ?? u.email ?? 'Unknown');
    }
  }

  const rows: HitListRow[] = (items ?? []).map((i) => ({
    id: i.id,
    stockNumber: i.stock_number,
    description: i.description,
    dateInStock: i.date_in_stock,
    spiffAmount: Number(i.spiff_amount),
    soldByUserId: i.sold_by_user_id,
    soldByName: i.sold_by_user_id ? nameByUserId.get(i.sold_by_user_id) ?? null : null,
    soldAt: i.sold_at,
    notes: i.notes,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hit list · ${store.name}`}
        description="Upload aged inventory as CSV or XLSX. Sold-by attribution is set automatically when a matching stock number is logged on a deal."
        actions={
          <Button asChild variant="outline">
            <Link href={`/${store.slug}/sales/setup`}>Back to setup</Link>
          </Button>
        }
      />

      <div className="px-4 md:px-6">
        <HitListManager storeId={store.id} rows={rows} />
      </div>
    </div>
  );
}
