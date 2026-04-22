'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUserContext } from '@pe/auth';
import { createClient } from '@pe/database/server';

const saveSchema = z.object({
  storeId: z.string().uuid(),
  dealDate: z.string().min(1, { message: 'Deal date is required.' }),
  dealNumber: z.string().trim().optional().default(''),
  customerName: z.string().trim().min(1, { message: 'Customer name is required.' }),
  salespersonUserId: z.string().uuid().or(z.literal('')).optional(),
  unitTypeId: z.string().uuid().or(z.literal('')).optional(),
  unitCount: z.coerce.number().int().min(1).default(1),
  stockNumber: z.string().trim().optional().default(''),
  pgaTotal: z.coerce.number().nonnegative().optional(),
  notes: z.string().trim().optional().default(''),
});

export type SaveDealResult =
  | {
      ok: true;
      dealId: string;
      message: string;
      /** Present if stock# matched an unsold hit-list row. */
      hitListMatch: {
        stockNumber: string;
        spiffAmount: number;
        unitLabel: string | null;
      } | null;
    }
  | { ok: false; error: string };

function unitLabel(row: {
  year: number | null;
  make: string | null;
  model_name: string | null;
  description: string | null;
}): string | null {
  const parts = [row.year, row.make, row.model_name].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return row.description;
}

export async function saveDeal(formData: FormData): Promise<SaveDealResult> {
  const ctx = await requireUserContext();

  const parsed = saveSchema.safeParse({
    storeId: formData.get('storeId'),
    dealDate: formData.get('dealDate'),
    dealNumber: formData.get('dealNumber'),
    customerName: formData.get('customerName'),
    salespersonUserId: formData.get('salespersonUserId'),
    unitTypeId: formData.get('unitTypeId'),
    unitCount: formData.get('unitCount'),
    stockNumber: formData.get('stockNumber'),
    pgaTotal: formData.get('pgaTotal'),
    notes: formData.get('notes'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  if (!ctx.stores.some((s) => s.id === parsed.data.storeId)) {
    return { ok: false, error: 'No access to this store.' };
  }

  const supabase = createClient();

  const salespersonId =
    parsed.data.salespersonUserId && parsed.data.salespersonUserId.length > 0
      ? parsed.data.salespersonUserId
      : null;

  const stock = parsed.data.stockNumber.trim();

  const { data: inserted, error: insertError } = await supabase
    .from('deals')
    .insert({
      store_id: parsed.data.storeId,
      deal_date: parsed.data.dealDate,
      deal_number: parsed.data.dealNumber || null,
      customer_name: parsed.data.customerName,
      salesperson_user_id: salespersonId,
      unit_type_id:
        parsed.data.unitTypeId && parsed.data.unitTypeId.length > 0
          ? parsed.data.unitTypeId
          : null,
      unit_count: parsed.data.unitCount,
      stock_number: stock || null,
      pga_total:
        typeof parsed.data.pgaTotal === 'number' ? parsed.data.pgaTotal : null,
      notes: parsed.data.notes || null,
      status: 'pending_finance',
      created_by: ctx.user.id,
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    return { ok: false, error: insertError?.message ?? 'Insert failed.' };
  }

  // Hit-list auto-match: if stock# matches an unsold aged_inventory row for
  // this store, attribute it to the salesperson and flag the spiff earned.
  type HitListMatch = {
    stockNumber: string;
    spiffAmount: number;
    unitLabel: string | null;
  };
  let hitListMatch: HitListMatch | null = null;

  if (stock && salespersonId) {
    const { data: match } = await supabase
      .from('aged_inventory')
      .select('id, stock_number, spiff_amount, year, make, model_name, description')
      .eq('store_id', parsed.data.storeId)
      .eq('stock_number', stock)
      .is('sold_by_user_id', null)
      .maybeSingle();

    if (match) {
      const { error: updateError } = await supabase
        .from('aged_inventory')
        .update({
          sold_by_user_id: salespersonId,
          sold_at: parsed.data.dealDate,
        })
        .eq('id', match.id);

      if (!updateError) {
        hitListMatch = {
          stockNumber: match.stock_number,
          spiffAmount: Number(match.spiff_amount),
          unitLabel: unitLabel(match),
        };
      }
    }
  }

  const store = ctx.stores.find((s) => s.id === parsed.data.storeId);
  if (store) {
    revalidatePath(`/${store.slug}/sales`);
    revalidatePath(`/${store.slug}/sales/setup/hit-list`);
  }

  const spiffLine = hitListMatch
    ? ` Hit-list spiff earned: $${hitListMatch.spiffAmount}.`
    : '';
  return {
    ok: true,
    dealId: inserted.id,
    message: `Deal logged.${spiffLine}`,
    hitListMatch,
  };
}
