'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUserContext } from '@pe/auth';
import { createClient } from '@pe/database/server';

const rowSchema = z.object({
  unitTypeId: z.string().uuid(),
  target: z.coerce.number().nonnegative(),
  stretch: z.coerce.number().nonnegative(),
  payout: z.coerce.number().nonnegative(),
  stretchPayout: z.coerce.number().nonnegative(),
});

const saveSchema = z.object({
  storeId: z.string().uuid(),
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  rows: z.array(rowSchema).min(1),
});

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function saveGoals(formData: FormData): Promise<ActionResult> {
  const ctx = await requireUserContext();

  const storeId = formData.get('storeId');
  const year = formData.get('year');
  const month = formData.get('month');

  // Parse repeated row fields: row[0].unitTypeId, row[0].target, etc.
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

  // RLS enforces that the user has access to this store and the sales_manager
  // role (or admin). The client redirects non-managers away, so this mostly
  // guards against a direct form submission.
  if (!ctx.stores.some((s) => s.id === parsed.data.storeId)) {
    return { ok: false, error: 'No access to this store.' };
  }

  const supabase = createClient();
  const upsertRows = parsed.data.rows.map((r) => ({
    store_id: parsed.data.storeId,
    unit_type_id: r.unitTypeId,
    year: parsed.data.year,
    month: parsed.data.month,
    target: r.target,
    stretch: r.stretch,
    payout: r.payout,
    stretch_payout: r.stretchPayout,
  }));

  const { error } = await supabase
    .from('sales_goals')
    .upsert(upsertRows, { onConflict: 'store_id,year,month,unit_type_id' });

  if (error) return { ok: false, error: error.message };

  // Find the store slug for the revalidate path.
  const store = ctx.stores.find((s) => s.id === parsed.data.storeId);
  if (store) {
    revalidatePath(`/${store.slug}/sales/setup/goals`);
  }
  return { ok: true, message: 'Goals saved.' };
}
