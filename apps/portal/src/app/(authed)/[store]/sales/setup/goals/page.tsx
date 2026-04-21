import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Button, PageHeader } from '@pe/ui';
import { requireUserContext, getLandingPath } from '@pe/auth';
import { createClient } from '@pe/database/server';
import { GoalsForm, type GoalRow, type UnitTypeOption } from './goals-form';

export const metadata: Metadata = { title: 'Monthly goals' };

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

function prevMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

function nextMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

interface GoalsPageProps {
  params: { store: string };
  searchParams: { year?: string; month?: string };
}

export default async function GoalsSetupPage({ params, searchParams }: GoalsPageProps) {
  noStore();
  const ctx = await requireUserContext();
  const store = ctx.stores.find((s) => s.slug === params.store);
  if (!store) redirect(getLandingPath(ctx));

  const now = new Date();
  const year = clampYear(Number(searchParams.year ?? now.getFullYear()));
  const month = clampMonth(Number(searchParams.month ?? now.getMonth() + 1));

  const supabase = createClient();

  const { data: unitTypes, error: unitError } = await supabase
    .from('unit_types')
    .select('id, slug, label, sort_order')
    .eq('store_id', store.id)
    .eq('active', true)
    .order('sort_order');

  if (unitError) notFound();

  const { data: existingGoals } = await supabase
    .from('sales_goals')
    .select('id, unit_type_id, target, stretch, payout, stretch_payout')
    .eq('store_id', store.id)
    .eq('year', year)
    .eq('month', month);

  const goalByUnitType = new Map(
    (existingGoals ?? []).map((g) => [g.unit_type_id, g]),
  );

  const rows: GoalRow[] = (unitTypes ?? []).map((ut) => {
    const g = goalByUnitType.get(ut.id);
    return {
      unitTypeId: ut.id,
      label: ut.label,
      target: g?.target ?? 0,
      stretch: g?.stretch ?? 0,
      payout: g?.payout ?? 0,
      stretchPayout: g?.stretch_payout ?? 0,
      goalId: g?.id ?? null,
    };
  });

  const unitTypeOptions: UnitTypeOption[] = (unitTypes ?? []).map((ut) => ({
    id: ut.id,
    label: ut.label,
  }));

  const prev = prevMonth(year, month);
  const next = nextMonth(year, month);
  const prevHref = `/${store.slug}/sales/setup/goals?year=${prev.year}&month=${prev.month}`;
  const nextHref = `/${store.slug}/sales/setup/goals?year=${next.year}&month=${next.month}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Monthly goals · ${store.name}`}
        description={`${MONTHS[month - 1]} ${year}`}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={prevHref}>&larr; Prev</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={nextHref}>Next &rarr;</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/${store.slug}/sales/setup`}>Back to setup</Link>
            </Button>
          </div>
        }
      />

      <div className="px-4 md:px-6">
        <GoalsForm
          storeId={store.id}
          year={year}
          month={month}
          rows={rows}
          unitTypes={unitTypeOptions}
        />
      </div>
    </div>
  );
}
