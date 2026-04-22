'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUserContext } from '@pe/auth';
import { createClient } from '@pe/database/server';

const rowSchema = z.object({
  name: z.string().trim().min(1, { message: 'Contest name is required.' }),
  description: z.string().trim().optional().default(''),
  prize: z.string().trim().optional().default(''),
  winnerUserId: z.string().uuid().or(z.literal('')).optional(),
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

export async function saveContests(formData: FormData): Promise<ActionResult> {
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

  const supabase = createClient();

  const { error: delError } = await supabase
    .from('contests')
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
      name: r.name,
      description: r.description || null,
      prize: r.prize || null,
      winner_user_id: r.winnerUserId ? r.winnerUserId : null,
      created_by: ctx.user.id,
    }));
    const { error: insError } = await supabase.from('contests').insert(insertRows);
    if (insError) return { ok: false, error: insError.message };
  }

  const store = ctx.stores.find((s) => s.id === parsed.data.storeId);
  if (store) {
    revalidatePath(`/${store.slug}/sales/setup/contests`);
  }
  return { ok: true, message: 'Contests saved.' };
}
