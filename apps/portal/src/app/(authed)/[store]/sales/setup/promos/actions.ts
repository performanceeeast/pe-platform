'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUserContext } from '@pe/auth';
import { createClient } from '@pe/database/server';

const uploadSchema = z.object({
  storeId: z.string().uuid(),
  title: z.string().trim().min(1, { message: 'Title is required.' }),
  effectiveStart: z.string().optional().default(''),
  effectiveEnd: z.string().optional().default(''),
  notes: z.string().trim().optional().default(''),
});

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

function emptyDate(v?: string): string | null {
  return v && v.length > 0 ? v : null;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function uploadPromo(formData: FormData): Promise<ActionResult> {
  const ctx = await requireUserContext();

  const storeId = formData.get('storeId');
  const title = formData.get('title');
  const effectiveStart = formData.get('effectiveStart');
  const effectiveEnd = formData.get('effectiveEnd');
  const notes = formData.get('notes');
  const file = formData.get('file');

  const parsed = uploadSchema.safeParse({
    storeId,
    title,
    effectiveStart,
    effectiveEnd,
    notes,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Pick a file to upload.' };
  }

  if (!ctx.stores.some((s) => s.id === parsed.data.storeId)) {
    return { ok: false, error: 'No access to this store.' };
  }

  const supabase = createClient();

  const safe = sanitizeFilename(file.name);
  const stamp = Date.now();
  const path = `${parsed.data.storeId}/${stamp}_${safe}`;

  const { error: uploadError } = await supabase.storage
    .from('promo-docs')
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    return { ok: false, error: `Upload failed: ${uploadError.message}` };
  }

  const { error: insertError } = await supabase.from('promo_docs').insert({
    store_id: parsed.data.storeId,
    title: parsed.data.title,
    storage_path: path,
    effective_start: emptyDate(parsed.data.effectiveStart),
    effective_end: emptyDate(parsed.data.effectiveEnd),
    notes: parsed.data.notes || null,
    uploaded_by: ctx.user.id,
  });

  if (insertError) {
    // Roll back the storage upload so we don't leave an orphan file.
    await supabase.storage.from('promo-docs').remove([path]);
    return { ok: false, error: insertError.message };
  }

  const store = ctx.stores.find((s) => s.id === parsed.data.storeId);
  if (store) {
    revalidatePath(`/${store.slug}/sales/setup/promos`);
  }
  return { ok: true, message: 'Promo uploaded.' };
}

const deleteSchema = z.object({
  id: z.string().uuid(),
  storagePath: z.string().min(1),
  storeSlug: z.string().min(1),
});

export async function deletePromo(formData: FormData): Promise<ActionResult> {
  await requireUserContext();

  const parsed = deleteSchema.safeParse({
    id: formData.get('id'),
    storagePath: formData.get('storagePath'),
    storeSlug: formData.get('storeSlug'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const supabase = createClient();

  // Delete the metadata row first — if RLS blocks us, the file stays intact.
  const { error: dbError } = await supabase
    .from('promo_docs')
    .delete()
    .eq('id', parsed.data.id);
  if (dbError) return { ok: false, error: dbError.message };

  // Best-effort storage cleanup; metadata row is already gone.
  await supabase.storage.from('promo-docs').remove([parsed.data.storagePath]);

  revalidatePath(`/${parsed.data.storeSlug}/sales/setup/promos`);
  return { ok: true, message: 'Promo removed.' };
}
