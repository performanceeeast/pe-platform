'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUserContext } from '@pe/auth';
import { createClient } from '@pe/database/server';

const rowSchema = z.object({
  id: z.string().uuid().or(z.literal('')).optional(),
  stockNumber: z.string().trim().min(1, { message: 'Stock # is required.' }),
  description: z.string().trim().optional().default(''),
  dateInStock: z.string().optional().default(''),
  spiffAmount: z.coerce.number().nonnegative(),
  soldByUserId: z.string().uuid().or(z.literal('')).optional(),
  soldAt: z.string().optional().default(''),
  notes: z.string().trim().optional().default(''),
});

const saveSchema = z.object({
  storeId: z.string().uuid(),
  rows: z.array(rowSchema),
});

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

function emptyDate(v?: string): string | null {
  return v && v.length > 0 ? v : null;
}

export async function saveHitList(formData: FormData): Promise<ActionResult> {
  const ctx = await requireUserContext();

  const storeId = formData.get('storeId');

  const rowEntries: Record<number, Record<string, FormDataEntryValue>> = {};
  for (const [key, value] of formData.entries()) {
    const match = /^row\[(\d+)\]\.(\w+)$/.exec(key);
    if (!match) continue;
    const idx = Number(match[1]);
    const field = match[2]!;
    if (!rowEntries[idx]) rowEntries[idx] = {};
    rowEntries[idx]![field] = value;
  }
  const rows = Object.keys(rowEntries)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => rowEntries[Number(k)]);

  const parsed = saveSchema.safeParse({ storeId, rows });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  if (!ctx.stores.some((s) => s.id === parsed.data.storeId)) {
    return { ok: false, error: 'No access to this store.' };
  }

  // Check for duplicate stock numbers in the submission.
  const stocks = parsed.data.rows.map((r) => r.stockNumber);
  if (new Set(stocks).size !== stocks.length) {
    return { ok: false, error: 'Each row needs a unique stock number.' };
  }

  const supabase = createClient();

  // Diff-based save: delete rows whose IDs existed before but are no longer
  // in the form, then upsert the rest. Preserves sold_at history for kept
  // rows in a way "delete all then insert" wouldn't.
  const submittedIds = parsed.data.rows
    .map((r) => r.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  const { data: existing } = await supabase
    .from('aged_inventory')
    .select('id')
    .eq('store_id', parsed.data.storeId);

  const existingIds = (existing ?? []).map((r) => r.id);
  const toDelete = existingIds.filter((id) => !submittedIds.includes(id));

  if (toDelete.length > 0) {
    const { error: delError } = await supabase
      .from('aged_inventory')
      .delete()
      .in('id', toDelete);
    if (delError) return { ok: false, error: `Delete failed: ${delError.message}` };
  }

  if (parsed.data.rows.length > 0) {
    const upsertRows = parsed.data.rows.map((r) => ({
      id: r.id && r.id.length > 0 ? r.id : undefined,
      store_id: parsed.data.storeId,
      stock_number: r.stockNumber,
      description: r.description || null,
      date_in_stock: emptyDate(r.dateInStock),
      spiff_amount: r.spiffAmount,
      sold_by_user_id: r.soldByUserId && r.soldByUserId.length > 0 ? r.soldByUserId : null,
      sold_at: emptyDate(r.soldAt),
      notes: r.notes || null,
      created_by: ctx.user.id,
    }));

    const { error: upError } = await supabase
      .from('aged_inventory')
      .upsert(upsertRows);
    if (upError) return { ok: false, error: upError.message };
  }

  const store = ctx.stores.find((s) => s.id === parsed.data.storeId);
  if (store) {
    revalidatePath(`/${store.slug}/sales/setup/hit-list`);
  }
  return { ok: true, message: 'Hit list saved.' };
}
