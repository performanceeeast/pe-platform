'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUserContext } from '@pe/auth';
import { createClient } from '@pe/database/server';

const rowSchema = z
  .object({
    minAmount: z.coerce.number().nonnegative(),
    maxAmount: z.coerce.number().nonnegative(),
    spiffAmount: z.coerce.number().nonnegative(),
  })
  .refine((r) => r.maxAmount >= r.minAmount, {
    message: 'Max must be greater than or equal to Min.',
  });

const saveSchema = z.object({
  storeId: z.string().uuid(),
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  rows: z.array(rowSchema),
});

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function saveTiers(formData: FormData): Promise<ActionResult> {
  const ctx = await requireUserContext();

  const storeId = formData.get('storeId');
  const year = formData.get('year');
  const month = formData.get('month');

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

  const parsed = saveSchema.safeParse({ storeId, year, month, rows });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  if (!ctx.stores.some((s) => s.id === parsed.data.storeId)) {
    return { ok: false, error: 'No access to this store.' };
  }

  // Check for duplicate min_amount across rows (breaks the unique constraint).
  const mins = parsed.data.rows.map((r) => r.minAmount);
  if (new Set(mins).size !== mins.length) {
    return { ok: false, error: 'Each tier needs a unique Min amount.' };
  }

  const supabase = createClient();

  // Simple: replace all tiers for the month. PGA tiers are a small list (3-5
  // rows), and "delete then insert" keeps the shape exactly matching what
  // the form submitted.
  const { error: delError } = await supabase
    .from('pga_tiers')
    .delete()
    .eq('store_id', parsed.data.storeId)
    .eq('year', parsed.data.year)
    .eq('month', parsed.data.month);

  if (delError) return { ok: false, error: `Clear failed: ${delError.message}` };

  if (parsed.data.rows.length > 0) {
    const insertRows = parsed.data.rows.map((r) => ({
      store_id: parsed.data.storeId,
      year: parsed.data.year,
      month: parsed.data.month,
      min_amount: r.minAmount,
      max_amount: r.maxAmount,
      spiff_amount: r.spiffAmount,
    }));
    const { error: insError } = await supabase.from('pga_tiers').insert(insertRows);
    if (insError) return { ok: false, error: insError.message };
  }

  const store = ctx.stores.find((s) => s.id === parsed.data.storeId);
  if (store) {
    revalidatePath(`/${store.slug}/sales/setup/pga`);
  }
  return { ok: true, message: 'PG&A tiers saved.' };
}
