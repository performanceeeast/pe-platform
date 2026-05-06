'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUserContext } from '@pe/auth';
import { createClient } from '@pe/database/server';

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

function emptyToNull(v: FormDataEntryValue | null): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length ? t : null;
}

function uuidOrNull(v: FormDataEntryValue | null): string | null {
  const s = emptyToNull(v);
  if (!s) return null;
  return z.string().uuid().safeParse(s).success ? s : null;
}

async function resolveStoreSlug(storeId: string): Promise<string | null> {
  const ctx = await requireUserContext();
  return ctx.stores.find((s) => s.id === storeId)?.slug ?? null;
}

// -----------------------------------------------------------------------------
// Traffic log (walk-ins, phone calls). Owned by Sales Manager — ISM only logs
// appointments + daily lead counts.
// -----------------------------------------------------------------------------

const trafficSchema = z.object({
  storeId: z.string().uuid(),
  trafficDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Invalid date.' }),
  customerName: z.string().trim().nullable(),
  salespersonUserId: z.string().uuid().nullable(),
  leadSourceId: z.string().uuid().nullable(),
  notes: z.string().trim().nullable(),
});

export async function saveTraffic(formData: FormData): Promise<ActionResult> {
  const ctx = await requireUserContext();

  const parsed = trafficSchema.safeParse({
    storeId: formData.get('storeId'),
    trafficDate: formData.get('trafficDate'),
    customerName: emptyToNull(formData.get('customerName')),
    salespersonUserId: uuidOrNull(formData.get('salespersonUserId')),
    leadSourceId: uuidOrNull(formData.get('leadSourceId')),
    notes: emptyToNull(formData.get('notes')),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }
  if (!ctx.stores.some((s) => s.id === parsed.data.storeId)) {
    return { ok: false, error: 'No access to this store.' };
  }

  const supabase = createClient();
  const { error } = await supabase.from('traffic_log').insert({
    store_id: parsed.data.storeId,
    traffic_date: parsed.data.trafficDate,
    customer_name: parsed.data.customerName,
    salesperson_user_id: parsed.data.salespersonUserId,
    lead_source_id: parsed.data.leadSourceId,
    notes: parsed.data.notes,
    created_by: ctx.user.id,
  });
  if (error) return { ok: false, error: error.message };

  const slug = await resolveStoreSlug(parsed.data.storeId);
  if (slug) revalidatePath(`/${slug}/sales/manager`);
  return { ok: true, message: 'Traffic logged.' };
}

const deleteTrafficSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
});

export async function deleteTraffic(formData: FormData): Promise<ActionResult> {
  const ctx = await requireUserContext();

  const parsed = deleteTrafficSchema.safeParse({
    id: formData.get('id'),
    storeId: formData.get('storeId'),
  });
  if (!parsed.success) return { ok: false, error: 'Invalid input.' };
  if (!ctx.stores.some((s) => s.id === parsed.data.storeId)) {
    return { ok: false, error: 'No access to this store.' };
  }

  const supabase = createClient();
  const { error } = await supabase.from('traffic_log').delete().eq('id', parsed.data.id);
  if (error) return { ok: false, error: error.message };

  const slug = await resolveStoreSlug(parsed.data.storeId);
  if (slug) revalidatePath(`/${slug}/sales/manager`);
  return { ok: true, message: 'Traffic entry deleted.' };
}
