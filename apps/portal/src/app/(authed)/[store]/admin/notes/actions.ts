'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUserContext } from '@pe/auth';
import { createClient } from '@pe/database/server';

const DEPARTMENTS = ['sales', 'service', 'parts', 'fni', 'other'] as const;

const createNoteSchema = z.object({
  storeSlug: z.string().trim().min(1),
  date: z.string().min(1, 'Note date is required.'),
  text: z.string().trim().min(1, 'Note text is required.').max(20000),
});

const createTaskSchema = z.object({
  storeSlug: z.string().trim().min(1),
  noteId: z.string().uuid(),
  title: z.string().trim().min(1, 'Task title is required.').max(300),
  department: z.enum(DEPARTMENTS),
  priority: z.coerce.number().int().min(0).max(3),
  dueDate: z.string().optional().default(''),
});

const deleteNoteSchema = z.object({
  storeSlug: z.string().trim().min(1),
  noteId: z.string().uuid(),
});

export type NotesActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

function userCanAccessStore(
  stores: Array<{ slug: string }>,
  storeSlug: string,
): boolean {
  return stores.some((store) => store.slug === storeSlug);
}

export async function createNote(formData: FormData): Promise<NotesActionResult> {
  const parsed = createNoteSchema.safeParse({
    storeSlug: formData.get('storeSlug'),
    date: formData.get('date'),
    text: formData.get('text'),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid note.',
    };
  }

  const ctx = await requireUserContext();
  if (!userCanAccessStore(ctx.stores, parsed.data.storeSlug)) {
    return { ok: false, error: 'No access to this store.' };
  }

  const supabase = createClient();
  const { error } = await supabase.from('notes').insert({
    date: parsed.data.date,
    transcribed_text: parsed.data.text,
    processed_at: new Date().toISOString(),
    created_by: ctx.user.id,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/${parsed.data.storeSlug}/admin/notes`);
  return { ok: true, message: 'Note saved.' };
}

export async function createTaskFromNote(
  formData: FormData,
): Promise<NotesActionResult> {
  const parsed = createTaskSchema.safeParse({
    storeSlug: formData.get('storeSlug'),
    noteId: formData.get('noteId'),
    title: formData.get('title'),
    department: formData.get('department'),
    priority: formData.get('priority'),
    dueDate: formData.get('dueDate'),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid task.',
    };
  }

  const ctx = await requireUserContext();
  if (!userCanAccessStore(ctx.stores, parsed.data.storeSlug)) {
    return { ok: false, error: 'No access to this store.' };
  }

  const supabase = createClient();
  const { data: note } = await supabase
    .from('notes')
    .select('id')
    .eq('id', parsed.data.noteId)
    .maybeSingle();
  if (!note) return { ok: false, error: 'Note not found or access denied.' };

  const dueDate = parsed.data.dueDate
    ? `${parsed.data.dueDate}T17:00:00`
    : null;
  const { error } = await supabase.from('tasks').insert({
    title: parsed.data.title,
    department: parsed.data.department,
    priority: parsed.data.priority,
    status: 'today',
    due_date: dueDate,
    source: 'handwritten',
    source_ref: note.id,
    note_id: note.id,
    created_by: ctx.user.id,
  });
  if (error) return { ok: false, error: error.message };

  const { count } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('note_id', note.id);
  await supabase
    .from('notes')
    .update({ tasks_extracted_count: count ?? 0 })
    .eq('id', note.id);

  revalidatePath(`/${parsed.data.storeSlug}/admin/notes`);
  revalidatePath(`/${parsed.data.storeSlug}/admin`);
  return { ok: true, message: 'Task added to Today.' };
}

export async function deleteNote(formData: FormData): Promise<NotesActionResult> {
  const parsed = deleteNoteSchema.safeParse({
    storeSlug: formData.get('storeSlug'),
    noteId: formData.get('noteId'),
  });
  if (!parsed.success) return { ok: false, error: 'Invalid note.' };

  const ctx = await requireUserContext();
  if (!userCanAccessStore(ctx.stores, parsed.data.storeSlug)) {
    return { ok: false, error: 'No access to this store.' };
  }

  const supabase = createClient();
  const { error } = await supabase.from('notes').delete().eq('id', parsed.data.noteId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/${parsed.data.storeSlug}/admin/notes`);
  return { ok: true, message: 'Note deleted.' };
}
