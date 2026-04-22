'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUserContext } from '@pe/auth';
import { createClient } from '@pe/database/server';

const rowSchema = z.object({
  fniProductId: z.string().uuid(),
  amount: z.coerce.number().nonnegative(),
});

const saveSchema = z.object({
  storeId: z.string().uuid(),
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  allProductsBonus: z.coerce.number().nonnegative(),
  rows: z.array(rowSchema).min(1),
});

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function saveSpiffs(formData: FormData): Promise<ActionResult> {
  const ctx = await requireUserContext();

  const storeId = formData.get('storeId');
  const year = formData.get('year');
  const month = formData.get('month');
  const allProductsBonus = formData.get('allProductsBonus');

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

  const parsed = saveSchema.safeParse({ storeId, year, month, allProductsBonus, rows });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  if (!ctx.stores.some((s) => s.id === parsed.data.storeId)) {
    return { ok: false, error: 'No access to this store.' };
  }

  const supabase = createClient();
  const upsertRows = parsed.data.rows.map((r) => ({
    store_id: parsed.data.storeId,
    fni_product_id: r.fniProductId,
    year: parsed.data.year,
    month: parsed.data.month,
    amount: r.amount,
    all_products_bonus: parsed.data.allProductsBonus,
  }));

  const { error } = await supabase
    .from('be_spiffs')
    .upsert(upsertRows, { onConflict: 'store_id,year,month,fni_product_id' });

  if (error) return { ok: false, error: error.message };

  const store = ctx.stores.find((s) => s.id === parsed.data.storeId);
  if (store) {
    revalidatePath(`/${store.slug}/sales/setup/spiffs`);
  }
  return { ok: true, message: 'Spiffs saved.' };
}
