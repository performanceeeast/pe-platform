'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUserContext } from '@pe/auth';
import { createClient } from '@pe/database/server';

const createProjectTaskSchema = z.object({
  projectId: z.string().uuid(),
  storeSlug: z.string().trim().min(1),
  title: z.string().trim().min(1, 'Task title is required.').max(300),
  priority: z.coerce.number().int().min(0).max(3),
  dueDate: z.string().optional().default(''),
});

export type CreateProjectTaskResult =
  | { ok: true }
  | { ok: false; error: string };

export async function createProjectTask(
  formData: FormData,
): Promise<CreateProjectTaskResult> {
  const parsed = createProjectTaskSchema.safeParse({
    projectId: formData.get('projectId'),
    storeSlug: formData.get('storeSlug'),
    title: formData.get('title'),
    priority: formData.get('priority'),
    dueDate: formData.get('dueDate'),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid task details.',
    };
  }

  const ctx = await requireUserContext();
  if (!ctx.stores.some((store) => store.slug === parsed.data.storeSlug)) {
    return { ok: false, error: 'No access to this store.' };
  }

  const supabase = createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, department')
    .eq('id', parsed.data.projectId)
    .maybeSingle();

  if (!project) {
    return { ok: false, error: 'Project not found or access denied.' };
  }

  const dueDate = parsed.data.dueDate
    ? `${parsed.data.dueDate}T17:00:00`
    : null;
  const { error } = await supabase.from('tasks').insert({
    title: parsed.data.title,
    department: project.department,
    priority: parsed.data.priority,
    status: 'today',
    due_date: dueDate,
    source: 'manual',
    project_id: project.id,
    created_by: ctx.user.id,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(
    `/${parsed.data.storeSlug}/admin/projects/${parsed.data.projectId}`,
  );
  revalidatePath(`/${parsed.data.storeSlug}/admin`);
  return { ok: true };
}
