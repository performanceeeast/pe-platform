'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUserContext } from '@pe/auth';
import { createClient } from '@pe/database/server';

type DealStatus =
  | 'pending_finance'
  | 'pending_salesperson'
  | 'complete'
  | 'delivered';

const saveSchema = z.object({
  dealId: z.string().uuid(),
  storeId: z.string().uuid(),
  dealDate: z.string().min(1),
  dealNumber: z.string().trim().optional().default(''),
  customerName: z.string().trim().min(1, { message: 'Customer name is required.' }),
  stockNumber: z.string().trim().optional().default(''),
  salespersonUserId: z.string().uuid().or(z.literal('')).optional(),
  unitTypeId: z.string().uuid().or(z.literal('')).optional(),
  unitCount: z.coerce.number().int().min(1).default(1),
  pgaTotal: z.string().optional().default(''),
  financeManagerUserId: z.string().uuid().or(z.literal('')).optional(),
  financeReserve: z.string().optional().default(''),
  backEndTotal: z.string().optional().default(''),
  markDelivered: z.string().optional(),
  notes: z.string().trim().optional().default(''),
});

function parseOptionalNum(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function deriveStatus(
  hasFrontEnd: boolean,
  hasBackEnd: boolean,
  markDelivered: boolean,
): DealStatus {
  if (markDelivered && hasFrontEnd && hasBackEnd) return 'delivered';
  if (hasFrontEnd && hasBackEnd) return 'complete';
  if (hasFrontEnd && !hasBackEnd) return 'pending_finance';
  return 'pending_salesperson';
}

export type SaveResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function saveDealDetail(formData: FormData): Promise<SaveResult> {
  const ctx = await requireUserContext();

  const parsed = saveSchema.safeParse({
    dealId: formData.get('dealId'),
    storeId: formData.get('storeId'),
    dealDate: formData.get('dealDate'),
    dealNumber: formData.get('dealNumber'),
    customerName: formData.get('customerName'),
    stockNumber: formData.get('stockNumber'),
    salespersonUserId: formData.get('salespersonUserId'),
    unitTypeId: formData.get('unitTypeId'),
    unitCount: formData.get('unitCount'),
    pgaTotal: formData.get('pgaTotal'),
    financeManagerUserId: formData.get('financeManagerUserId'),
    financeReserve: formData.get('financeReserve'),
    backEndTotal: formData.get('backEndTotal'),
    markDelivered: formData.get('markDelivered') ?? undefined,
    notes: formData.get('notes'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  if (!ctx.stores.some((s) => s.id === parsed.data.storeId)) {
    return { ok: false, error: 'No access to this store.' };
  }

  const supabase = createClient();

  const pgaTotal = parseOptionalNum(parsed.data.pgaTotal);
  const financeReserve = parseOptionalNum(parsed.data.financeReserve);
  const backEndTotal = parseOptionalNum(parsed.data.backEndTotal);

  const salespersonId =
    parsed.data.salespersonUserId && parsed.data.salespersonUserId.length > 0
      ? parsed.data.salespersonUserId
      : null;
  const financeManagerId =
    parsed.data.financeManagerUserId && parsed.data.financeManagerUserId.length > 0
      ? parsed.data.financeManagerUserId
      : null;
  const unitTypeId =
    parsed.data.unitTypeId && parsed.data.unitTypeId.length > 0
      ? parsed.data.unitTypeId
      : null;

  const hasFrontEnd = Boolean(unitTypeId && salespersonId);
  const hasBackEnd = backEndTotal !== null || financeReserve !== null;
  const markDelivered = parsed.data.markDelivered === 'on';
  const status = deriveStatus(hasFrontEnd, hasBackEnd, markDelivered);

  // Collect checked F&I product IDs. Form sends one entry per checked box.
  const checkedFniIds = formData
    .getAll('fniProductIds')
    .filter((v): v is string => typeof v === 'string' && v.length > 0);

  const { error: updateError } = await supabase
    .from('deals')
    .update({
      deal_date: parsed.data.dealDate,
      deal_number: parsed.data.dealNumber || null,
      customer_name: parsed.data.customerName,
      stock_number: parsed.data.stockNumber || null,
      salesperson_user_id: salespersonId,
      unit_type_id: unitTypeId,
      unit_count: parsed.data.unitCount,
      pga_total: pgaTotal,
      finance_manager_user_id: financeManagerId,
      finance_reserve: financeReserve,
      back_end_total: backEndTotal,
      notes: parsed.data.notes || null,
      status,
    })
    .eq('id', parsed.data.dealId);

  if (updateError) return { ok: false, error: updateError.message };

  // Replace deal_fni_products: delete all for this deal, insert fresh.
  const { error: delError } = await supabase
    .from('deal_fni_products')
    .delete()
    .eq('deal_id', parsed.data.dealId);
  if (delError) return { ok: false, error: `Clear F&I products failed: ${delError.message}` };

  if (checkedFniIds.length > 0) {
    const insertRows = checkedFniIds.map((fniProductId) => ({
      deal_id: parsed.data.dealId,
      fni_product_id: fniProductId,
    }));
    const { error: insError } = await supabase
      .from('deal_fni_products')
      .insert(insertRows);
    if (insError) return { ok: false, error: `Save F&I products failed: ${insError.message}` };
  }

  const store = ctx.stores.find((s) => s.id === parsed.data.storeId);
  if (store) {
    revalidatePath(`/${store.slug}/sales/deals`);
    revalidatePath(`/${store.slug}/sales/deals/${parsed.data.dealId}`);
    revalidatePath(`/${store.slug}/sales`);
  }

  return { ok: true, message: 'Deal saved.' };
}

const deleteSchema = z.object({
  dealId: z.string().uuid(),
  storeSlug: z.string().min(1),
});

export async function deleteDeal(formData: FormData): Promise<SaveResult> {
  await requireUserContext();

  const parsed = deleteSchema.safeParse({
    dealId: formData.get('dealId'),
    storeSlug: formData.get('storeSlug'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const supabase = createClient();
  const { error } = await supabase.from('deals').delete().eq('id', parsed.data.dealId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/${parsed.data.storeSlug}/sales/deals`);
  revalidatePath(`/${parsed.data.storeSlug}/sales`);
  return { ok: true, message: 'Deal deleted.' };
}
