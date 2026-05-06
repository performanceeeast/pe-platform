'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUserContext } from '@pe/auth';
import { createClient } from '@pe/database/server';

const profileSchema = z.object({
  fullName: z.string().trim().min(1, { message: 'Name is required.' }).max(120),
});

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Self-update for the signed-in user. Only `full_name` is mutable here —
 * email, role, store access, and salesperson grant are admin-managed.
 */
export async function updateMyProfile(formData: FormData): Promise<ActionResult> {
  const ctx = await requireUserContext();

  const parsed = profileSchema.safeParse({
    fullName: formData.get('fullName'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('user_profiles')
    .update({ full_name: parsed.data.fullName })
    .eq('id', ctx.user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/profile');
  return { ok: true, message: 'Profile updated.' };
}
