'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUserContext } from '@pe/auth';
import { createClient } from '@pe/database/server';

export type ActionResult<T = undefined> =
  | (T extends undefined ? { ok: true; message: string } : { ok: true; message: string; data: T })
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

function revalidateInternet(slug: string): void {
  revalidatePath(`/${slug}/sales/internet`);
}

async function resolveStoreSlug(storeId: string): Promise<string | null> {
  const ctx = await requireUserContext();
  return ctx.stores.find((s) => s.id === storeId)?.slug ?? null;
}

// -----------------------------------------------------------------------------
// Appointments
// -----------------------------------------------------------------------------

const appointmentSchema = z.object({
  id: z.string().uuid().nullable(),
  storeId: z.string().uuid(),
  apptDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Invalid date.' }),
  customerName: z.string().trim().min(1, { message: 'Customer name is required.' }),
  unitInterested: z.string().trim().nullable(),
  salespersonUserId: z.string().uuid().nullable(),
  leadSourceId: z.string().uuid().nullable(),
  kept: z.boolean(),
  sold: z.boolean(),
  notes: z.string().trim().nullable(),
});

export async function saveAppointment(formData: FormData): Promise<ActionResult> {
  const ctx = await requireUserContext();

  const parsed = appointmentSchema.safeParse({
    id: emptyToNull(formData.get('id')),
    storeId: formData.get('storeId'),
    apptDate: formData.get('apptDate'),
    customerName: formData.get('customerName'),
    unitInterested: emptyToNull(formData.get('unitInterested')),
    salespersonUserId: uuidOrNull(formData.get('salespersonUserId')),
    leadSourceId: uuidOrNull(formData.get('leadSourceId')),
    kept: formData.get('kept') === 'on' || formData.get('kept') === 'true',
    sold: formData.get('sold') === 'on' || formData.get('sold') === 'true',
    notes: emptyToNull(formData.get('notes')),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }
  if (!ctx.stores.some((s) => s.id === parsed.data.storeId)) {
    return { ok: false, error: 'No access to this store.' };
  }

  const supabase = createClient();
  const row = {
    store_id: parsed.data.storeId,
    appt_date: parsed.data.apptDate,
    customer_name: parsed.data.customerName,
    unit_interested: parsed.data.unitInterested,
    salesperson_user_id: parsed.data.salespersonUserId,
    lead_source_id: parsed.data.leadSourceId,
    kept: parsed.data.kept,
    sold: parsed.data.sold,
    notes: parsed.data.notes,
  };

  if (parsed.data.id) {
    const { error } = await supabase
      .from('appointments')
      .update(row)
      .eq('id', parsed.data.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from('appointments')
      .insert({ ...row, created_by: ctx.user.id });
    if (error) return { ok: false, error: error.message };
  }

  const slug = await resolveStoreSlug(parsed.data.storeId);
  if (slug) revalidateInternet(slug);
  return { ok: true, message: parsed.data.id ? 'Appointment updated.' : 'Appointment logged.' };
}

const outcomeSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  kept: z.boolean(),
  sold: z.boolean(),
});

export async function setAppointmentOutcome(formData: FormData): Promise<ActionResult> {
  const ctx = await requireUserContext();

  const parsed = outcomeSchema.safeParse({
    id: formData.get('id'),
    storeId: formData.get('storeId'),
    kept: formData.get('kept') === 'true',
    sold: formData.get('sold') === 'true',
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }
  if (!ctx.stores.some((s) => s.id === parsed.data.storeId)) {
    return { ok: false, error: 'No access to this store.' };
  }

  // Sold implies kept — keep them coherent.
  const kept = parsed.data.sold ? true : parsed.data.kept;

  const supabase = createClient();
  const { error } = await supabase
    .from('appointments')
    .update({ kept, sold: parsed.data.sold })
    .eq('id', parsed.data.id);
  if (error) return { ok: false, error: error.message };

  const slug = await resolveStoreSlug(parsed.data.storeId);
  if (slug) revalidateInternet(slug);
  return { ok: true, message: 'Updated.' };
}

const deleteAppointmentSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
});

export async function deleteAppointment(formData: FormData): Promise<ActionResult> {
  const ctx = await requireUserContext();

  const parsed = deleteAppointmentSchema.safeParse({
    id: formData.get('id'),
    storeId: formData.get('storeId'),
  });
  if (!parsed.success) return { ok: false, error: 'Invalid input.' };
  if (!ctx.stores.some((s) => s.id === parsed.data.storeId)) {
    return { ok: false, error: 'No access to this store.' };
  }

  const supabase = createClient();
  const { error } = await supabase.from('appointments').delete().eq('id', parsed.data.id);
  if (error) return { ok: false, error: error.message };

  const slug = await resolveStoreSlug(parsed.data.storeId);
  if (slug) revalidateInternet(slug);
  return { ok: true, message: 'Appointment deleted.' };
}

// -----------------------------------------------------------------------------
// Daily lead counts (upsert by store + date)
// -----------------------------------------------------------------------------

const dailyCountSchema = z.object({
  storeId: z.string().uuid(),
  countDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Invalid date.' }),
  totalLeads: z.coerce.number().int().min(0).max(10_000),
  notes: z.string().trim().nullable(),
});

export async function saveDailyLeadCount(formData: FormData): Promise<ActionResult> {
  const ctx = await requireUserContext();

  const parsed = dailyCountSchema.safeParse({
    storeId: formData.get('storeId'),
    countDate: formData.get('countDate'),
    totalLeads: formData.get('totalLeads'),
    notes: emptyToNull(formData.get('notes')),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }
  if (!ctx.stores.some((s) => s.id === parsed.data.storeId)) {
    return { ok: false, error: 'No access to this store.' };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('daily_lead_counts')
    .upsert(
      {
        store_id: parsed.data.storeId,
        count_date: parsed.data.countDate,
        total_leads: parsed.data.totalLeads,
        notes: parsed.data.notes,
        created_by: ctx.user.id,
      },
      { onConflict: 'store_id,count_date' },
    );
  if (error) return { ok: false, error: error.message };

  const slug = await resolveStoreSlug(parsed.data.storeId);
  if (slug) revalidateInternet(slug);
  return { ok: true, message: 'Daily count saved.' };
}

const deleteCountSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
});

export async function deleteDailyLeadCount(formData: FormData): Promise<ActionResult> {
  const ctx = await requireUserContext();

  const parsed = deleteCountSchema.safeParse({
    id: formData.get('id'),
    storeId: formData.get('storeId'),
  });
  if (!parsed.success) return { ok: false, error: 'Invalid input.' };
  if (!ctx.stores.some((s) => s.id === parsed.data.storeId)) {
    return { ok: false, error: 'No access to this store.' };
  }

  const supabase = createClient();
  const { error } = await supabase.from('daily_lead_counts').delete().eq('id', parsed.data.id);
  if (error) return { ok: false, error: error.message };

  const slug = await resolveStoreSlug(parsed.data.storeId);
  if (slug) revalidateInternet(slug);
  return { ok: true, message: 'Daily count deleted.' };
}

// -----------------------------------------------------------------------------
// Traffic log (walk-ins, phone leads)
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
  if (slug) revalidateInternet(slug);
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
  if (slug) revalidateInternet(slug);
  return { ok: true, message: 'Traffic entry deleted.' };
}
