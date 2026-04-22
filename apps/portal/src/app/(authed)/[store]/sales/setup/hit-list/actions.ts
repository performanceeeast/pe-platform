'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { requireUserContext } from '@pe/auth';
import { createClient } from '@pe/database/server';

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export type ImportResult =
  | { ok: true; inserted: number; updated: number; skipped: number; message: string }
  | { ok: false; error: string };

/**
 * Map any reasonable column name to our canonical field. Matches substrings
 * so "Stock #", "stock_number", "STOCK" all resolve to the same key.
 */
function canonicalKey(k: string): string {
  const norm = k.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (norm.includes('stock')) return 'stock_number';
  if (norm.includes('desc')) return 'description';
  if (norm.includes('date')) return 'date_in_stock';
  if (norm.includes('spiff') || norm === 'amount' || norm === 'bonus') {
    return 'spiff_amount';
  }
  if (norm.includes('note') || norm.includes('comment')) return 'notes';
  return norm;
}

function parseDate(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (!trimmed) return null;
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
}

function parseNum(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const cleaned = v.replace(/[^0-9.-]/g, '');
    if (!cleaned) return 0;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function parseStr(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);
  return '';
}

async function parseFile(file: File): Promise<Record<string, unknown>[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || file.type === 'text/csv') {
    const text = await file.text();
    const result = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h,
    });
    return result.data;
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return [];
    const sheet = wb.Sheets[sheetName];
    if (!sheet) return [];
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  }
  throw new Error('Unsupported file format. Upload a CSV or XLSX file.');
}

const importSchema = z.object({
  storeId: z.string().uuid(),
});

export async function importHitList(formData: FormData): Promise<ImportResult> {
  const ctx = await requireUserContext();

  const parsed = importSchema.safeParse({ storeId: formData.get('storeId') });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }
  const { storeId } = parsed.data;

  if (!ctx.stores.some((s) => s.id === storeId)) {
    return { ok: false, error: 'No access to this store.' };
  }

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Pick a file to upload.' };
  }

  let raw: Record<string, unknown>[];
  try {
    raw = await parseFile(file);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Parse failed.' };
  }

  if (raw.length === 0) {
    return { ok: false, error: 'No rows found in file.' };
  }

  // Normalize each row's keys to canonical names, then pull out fields.
  const rows = raw
    .map((r) => {
      const byKey: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r)) {
        byKey[canonicalKey(k)] = v;
      }
      return {
        stock_number: parseStr(byKey.stock_number),
        description: parseStr(byKey.description),
        date_in_stock: parseDate(byKey.date_in_stock),
        spiff_amount: parseNum(byKey.spiff_amount),
        notes: parseStr(byKey.notes),
      };
    })
    .filter((r) => r.stock_number.length > 0);

  if (rows.length === 0) {
    return {
      ok: false,
      error: 'No rows with a stock number found. Column must include "stock" in its name.',
    };
  }

  // Dedupe within the file itself — later wins.
  const dedup = new Map<string, (typeof rows)[number]>();
  for (const r of rows) dedup.set(r.stock_number, r);
  const finalRows = Array.from(dedup.values());

  const supabase = createClient();

  // Find existing stock numbers so we can report inserted vs updated counts.
  const { data: existing } = await supabase
    .from('aged_inventory')
    .select('stock_number')
    .eq('store_id', storeId)
    .in(
      'stock_number',
      finalRows.map((r) => r.stock_number),
    );
  const existingSet = new Set((existing ?? []).map((r) => r.stock_number));

  // Upsert. Only touches the columns we provide — sold_by_user_id and sold_at
  // on existing rows stay intact, preserving historical sold attribution.
  const upsertRows = finalRows.map((r) => ({
    store_id: storeId,
    stock_number: r.stock_number,
    description: r.description || null,
    date_in_stock: r.date_in_stock,
    spiff_amount: r.spiff_amount,
    notes: r.notes || null,
    created_by: ctx.user.id,
  }));

  const { error } = await supabase
    .from('aged_inventory')
    .upsert(upsertRows, { onConflict: 'store_id,stock_number' });

  if (error) return { ok: false, error: error.message };

  const inserted = finalRows.filter((r) => !existingSet.has(r.stock_number)).length;
  const updated = finalRows.length - inserted;
  const skipped = raw.length - finalRows.length;

  const store = ctx.stores.find((s) => s.id === storeId);
  if (store) revalidatePath(`/${store.slug}/sales/setup/hit-list`);

  return {
    ok: true,
    inserted,
    updated,
    skipped,
    message:
      `Imported ${finalRows.length} row${finalRows.length === 1 ? '' : 's'}: ` +
      `${inserted} new, ${updated} updated` +
      (skipped > 0 ? `, ${skipped} skipped (missing stock #)` : ''),
  };
}

const deleteSchema = z.object({
  id: z.string().uuid(),
  storeSlug: z.string().min(1),
});

export async function deleteHitListRow(formData: FormData): Promise<ActionResult> {
  await requireUserContext();

  const parsed = deleteSchema.safeParse({
    id: formData.get('id'),
    storeSlug: formData.get('storeSlug'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('aged_inventory')
    .delete()
    .eq('id', parsed.data.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/${parsed.data.storeSlug}/sales/setup/hit-list`);
  return { ok: true, message: 'Row removed.' };
}

const clearUnsoldSchema = z.object({
  storeId: z.string().uuid(),
});

export async function clearUnsoldHitList(formData: FormData): Promise<ActionResult> {
  const ctx = await requireUserContext();

  const parsed = clearUnsoldSchema.safeParse({ storeId: formData.get('storeId') });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  if (!ctx.stores.some((s) => s.id === parsed.data.storeId)) {
    return { ok: false, error: 'No access to this store.' };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('aged_inventory')
    .delete()
    .eq('store_id', parsed.data.storeId)
    .is('sold_by_user_id', null);
  if (error) return { ok: false, error: error.message };

  const store = ctx.stores.find((s) => s.id === parsed.data.storeId);
  if (store) revalidatePath(`/${store.slug}/sales/setup/hit-list`);
  return { ok: true, message: 'Unsold rows cleared.' };
}
