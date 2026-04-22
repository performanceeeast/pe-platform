import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Button, PageHeader } from '@pe/ui';
import { requireUserContext, getLandingPath } from '@pe/auth';
import { createClient } from '@pe/database/server';
import { DealForm, type SalespersonOption, type UnitTypeOption } from './deal-form';

export const metadata: Metadata = { title: 'Log a deal' };

interface NewDealPageProps {
  params: { store: string };
}

export default async function NewDealPage({ params }: NewDealPageProps) {
  noStore();
  const ctx = await requireUserContext();
  const store = ctx.stores.find((s) => s.slug === params.store);
  if (!store) redirect(getLandingPath(ctx));

  // Gate: any user with store access can log a deal (salesperson, mgr, F&I,
  // admin). Department-specific gating would block F&I mgrs from logging on
  // behalf of salespeople, which the doc explicitly allows.
  //
  // Non-admins need a sales-department role OR the F&I manager role.
  const isSalesDeptRole =
    ctx.role?.department === 'sales' || ctx.role?.department === 'fni';
  if (!ctx.isAdmin && !isSalesDeptRole) {
    redirect(getLandingPath(ctx));
  }

  const supabase = createClient();

  const { data: unitTypes } = await supabase
    .from('unit_types')
    .select('id, label, sort_order')
    .eq('store_id', store.id)
    .eq('active', true)
    .order('sort_order');

  // Salesperson pool: anyone with store access. The form defaults to the
  // current user if they hold a sales-department role, otherwise the mgr
  // entering the deal has to pick.
  const { data: accessRows } = await supabase
    .from('user_store_access')
    .select('user_id')
    .eq('store_id', store.id);

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
    .map((u) => ({
      id: u.id,
      label: u.full_name ?? u.email ?? 'Unknown',
    }));

  const unitTypeOptions: UnitTypeOption[] = (unitTypes ?? []).map((ut) => ({
    id: ut.id,
    label: ut.label,
  }));

  const defaultSalespersonId = isSalesDeptRole ? ctx.user.id : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Log a deal"
        description={`Front-end entry for ${store.name}. Finance completes back-end after.`}
        actions={
          <Button asChild variant="outline">
            <Link href={`/${store.slug}/sales`}>Back to sales</Link>
          </Button>
        }
      />

      <div className="px-4 md:px-6">
        <DealForm
          storeId={store.id}
          storeSlug={store.slug}
          unitTypes={unitTypeOptions}
          salespeople={salespeople}
          defaultSalespersonId={defaultSalespersonId}
        />
      </div>
    </div>
  );
}
