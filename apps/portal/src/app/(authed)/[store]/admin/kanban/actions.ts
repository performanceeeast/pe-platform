'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUserContext } from '@pe/auth';
import { createClient } from '@pe/database/server';

const STATUSES = ['inbox', 'today', 'this_week', 'waiting', 'done'] as const;

const moveTaskSchema = z.object({
  taskId: z.string().uuid(),
  storeSlug: z.string().trim().min(1),
  status: z.enum(STATUSES),
});

export type MoveTaskResult =
  | { ok: true }
  | { ok: false; error: string };

export async function moveTask(formData: FormData): Promise<MoveTaskResult> {
  const parsed = moveTaskSchema.safeParse({
    taskId: formData.get('taskId'),
    storeSlug: formData.get('storeSlug'),
    status: formData.get('status'),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid task move.',
    };
  }

  const ctx = await requireUserContext();
  if (!ctx.stores.some((store) => store.slug === parsed.data.storeSlug)) {
    return { ok: false, error: 'No access to this store.' };
  }

  const supabase = createClient();
  const { data: task } = await supabase
    .from('tasks')
    .select('id')
    .eq('id', parsed.data.taskId)
    .maybeSingle();
  if (!task) return { ok: false, error: 'Task not found or access denied.' };

  const { error } = await supabase
    .from('tasks')
    .update({
      status: parsed.data.status,
      completed_at:
        parsed.data.status === 'done' ? new Date().toISOString() : null,
    })
    .eq('id', task.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/${parsed.data.storeSlug}/admin/kanban`);
  revalidatePath(`/${parsed.data.storeSlug}/admin`);
  return { ok: true };
}
