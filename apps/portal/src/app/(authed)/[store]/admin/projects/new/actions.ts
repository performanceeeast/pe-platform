'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUserContext } from '@pe/auth';
import { createClient } from '@pe/database/server';

const DEPARTMENTS = ['sales', 'service', 'parts', 'fni', 'other'] as const;
const STATUSES = ['planning', 'active', 'on_hold'] as const;

const createProjectSchema = z
  .object({
    storeSlug: z.string().trim().min(1),
    name: z.string().trim().min(1, 'Project name is required.').max(200),
    description: z.string().trim().max(2000).optional().default(''),
    department: z.enum(DEPARTMENTS),
    status: z.enum(STATUSES),
    startDate: z.string().optional().default(''),
    targetEndDate: z.string().optional().default(''),
  })
  .refine(
    ({ startDate, targetEndDate }) =>
      !startDate || !targetEndDate || targetEndDate >= startDate,
    {
      message: 'Target end date must be on or after the start date.',
      path: ['targetEndDate'],
    },
  );

export type CreateProjectResult =
  | { ok: true; projectId: string }
  | { ok: false; error: string };

export async function createProject(formData: FormData): Promise<CreateProjectResult> {
  const parsed = createProjectSchema.safeParse({
    storeSlug: formData.get('storeSlug'),
    name: formData.get('name'),
    description: formData.get('description'),
    department: formData.get('department'),
    status: formData.get('status'),
    startDate: formData.get('startDate'),
    targetEndDate: formData.get('targetEndDate'),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid project details.',
    };
  }

  const ctx = await requireUserContext();
  if (!ctx.stores.some((store) => store.slug === parsed.data.storeSlug)) {
    return { ok: false, error: 'No access to this store.' };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: parsed.data.name,
      description: parsed.data.description || null,
      department: parsed.data.department,
      status: parsed.data.status,
      start_date: parsed.data.startDate || null,
      target_end_date: parsed.data.targetEndDate || null,
      created_by: ctx.user.id,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Project could not be created.' };
  }

  revalidatePath(`/${parsed.data.storeSlug}/admin/projects`);
  return { ok: true, projectId: data.id };
}
