import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Button, PageHeader } from '@pe/ui';
import { requireUserContext, getLandingPath } from '@pe/auth';
import { createClient } from '@pe/database/server';
import {
  DealDetailForm,
  type DealDetail,
  type FniProductOption,
  type SalespersonOption,
  type UnitTypeOption,
} from './deal-detail-form';

export const metadata: Metadata = { title: 'Deal detail' };

interface DealDetailPageProps {
  params: { store: string; id: string };
}

export default async function DealDetailPage({ params }: DealDetailPageProps) {
  noStore();
  const ctx = await requireUserContext();
  const store = ctx.stores.find((s) => s.slug === params.store);
  if (!store) redirect(getLandingPath(ctx));

  const isFni = ctx.role?.department === 'fni';
  if (!ctx.isAdmin && ctx.role?.department !== 'sales' && !isFni) {
    redirect(getLandingPath(ctx));
  }

  const supabase = createClient();

  const { data: deal, error } = await supabase
    .from('deals')
    .select(
      'id, deal_date, deal_number, customer_name, stock_number, pga_total, unit_count, unit_type_id, salesperson_user_id, finance_manager_user_id, finance_reserve, back_end_total, status, notes, store_id',
    )
    .eq('id', params.id)
    .maybeSingle();

  if (error || !deal) notFound();
  if (deal.store_id !== store.id) notFound();

  // Lookups for form dropdowns + existing F&I products checked on this deal.
  const [{ data: unitTypes }, { data: fniProducts }, { data: checkedProducts }, { data: accessRows }] =
    await Promise.all([
      supabase
        .from('unit_types')
        .select('id, label, sort_order')
        .eq('store_id', store.id)
        .eq('active', true)
        .order('sort_order'),
      supabase
        .from('fni_products')
        .select('id, label, sort_order')
        .eq('store_id', store.id)
        .eq('active', true)
        .order('sort_order'),
      supabase
        .from('deal_fni_products')
        .select('fni_product_id')
        .eq('deal_id', deal.id),
      supabase
        .from('user_store_access')
        .select('user_id')
        .eq('store_id', store.id),
    ]);

  const userIds = (accessRows ?? []).map((r) => r.user_id);
  const { data: users } = userIds.length
    ? await supabase
        .from('user_profiles')
        .select('id, full_name, email, department')
        .in('id', userIds)
        .eq('active', true)
        .order('full_name', { nullsFirst: false })
    : { data: [] };

  const salespeople: SalespersonOption[] = (users ?? [])
    .filter((u) => u.department === 'sales' || u.department === 'fni' || u.department === 'admin')
    .map((u) => ({ id: u.id, label: u.full_name ?? u.email ?? 'Unknown' }));

  const financeManagers: SalespersonOption[] = (users ?? [])
    .filter((u) => u.department === 'fni' || u.department === 'sales' || u.department === 'admin')
    .map((u) => ({ id: u.id, label: u.full_name ?? u.email ?? 'Unknown' }));

  const unitTypeOptions: UnitTypeOption[] = (unitTypes ?? []).map((ut) => ({
    id: ut.id,
    label: ut.label,
  }));

  const fniProductOptions: FniProductOption[] = (fniProducts ?? []).map((p) => ({
    id: p.id,
    label: p.label,
  }));

  const checkedSet = new Set(
    (checkedProducts ?? []).map((r) => r.fni_product_id),
  );

  const detail: DealDetail = {
    id: deal.id,
    dealDate: deal.deal_date,
    dealNumber: deal.deal_number ?? '',
    customerName: deal.customer_name,
    stockNumber: deal.stock_number ?? '',
    pgaTotal: deal.pga_total !== null ? Number(deal.pga_total) : null,
    unitCount: deal.unit_count,
    unitTypeId: deal.unit_type_id,
    salespersonUserId: deal.salesperson_user_id,
    financeManagerUserId: deal.finance_manager_user_id,
    financeReserve: deal.finance_reserve !== null ? Number(deal.finance_reserve) : null,
    backEndTotal: deal.back_end_total !== null ? Number(deal.back_end_total) : null,
    status: deal.status,
    notes: deal.notes ?? '',
    checkedFniProductIds: Array.from(checkedSet),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Deal \u00b7 ${deal.customer_name}`}
        description={`${deal.deal_date}${deal.deal_number ? ` \u00b7 #${deal.deal_number}` : ''} \u00b7 ${store.name}`}
        actions={
          <Button asChild variant="outline">
            <Link href={`/${store.slug}/sales/deals`}>Back to deals</Link>
          </Button>
        }
      />

      <div className="px-4 md:px-6">
        <DealDetailForm
          storeId={store.id}
          storeSlug={store.slug}
          deal={detail}
          unitTypes={unitTypeOptions}
          salespeople={salespeople}
          financeManagers={financeManagers}
          fniProducts={fniProductOptions}
        />
      </div>
    </div>
  );
}
