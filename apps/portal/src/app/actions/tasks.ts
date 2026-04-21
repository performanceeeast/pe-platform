'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@pe/database/server';

const DEPARTMENTS = [
  'sales',
  'service',
  'parts',
  'fni',
  'h2_grow',
  'personal',
  'other',
] as const;
const STATUSES = ['inbox', 'today', 'this_week', 'waiting', 'done', 'archived'] as const;

const createSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(300),
  department: z.enum(DEPARTMENTS).default('other'),
  priority: z.coerce.number().int().min(0).max(3).default(2),
  status: z.enum(STATUSES).default('today'),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Revalidate every route under /[store]/admin — covers today, kanban,
 * projects, department views, etc. Coarse but fine for personal-scale data.
 */
function revalidateAdminTree() {
  revalidatePath('/[store]/admin', 'layout');
}

export async function createTask(formData: FormData): Promise<ActionResult> {
  const parsed = createSchema.safeParse({
    title: formData.get('title'),
    department: formData.get('department') ?? undefined,
    priority: formData.get('priority') ?? undefined,
    status: formData.get('status') ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const { error } = await supabase.from('tasks').insert({
    title: parsed.data.title,
    department: parsed.data.department,
    priority: parsed.data.priority,
    status: parsed.data.status,
    source: 'manual',
    created_by: user.id,
  });

  if (error) return { ok: false, error: error.message };

  revalidateAdminTree();
  return { ok: true };
}

export async function completeTask(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from('tasks')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidateAdminTree();
  return { ok: true };
}

export async function reopenTask(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from('tasks')
    .update({ status: 'today', completed_at: null })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidateAdminTree();
  return { ok: true };
}
