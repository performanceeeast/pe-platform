'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { z } from 'zod';
import { requireUserContext } from '@pe/auth';
import { createAdminClient } from '@pe/database/admin';

const inviteSchema = z.object({
  email: z.string().email({ message: 'Enter a valid email address.' }),
  fullName: z.string().trim().optional(),
  roleId: z.string().uuid({ message: 'Pick a role.' }),
  storeIds: z.array(z.string().uuid()).min(1, { message: 'Select at least one store.' }),
  primaryStoreId: z.string().uuid({ message: 'Pick a primary store.' }),
});

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

async function requireAdmin() {
  const ctx = await requireUserContext();
  if (!ctx.isAdmin) {
    throw new Error('Not authorized');
  }
  return ctx;
}

export async function inviteUser(formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();

  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    fullName: formData.get('fullName') || undefined,
    roleId: formData.get('roleId'),
    storeIds: formData.getAll('storeIds'),
    primaryStoreId: formData.get('primaryStoreId'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }
  const { email, fullName, roleId, storeIds, primaryStoreId } = parsed.data;

  if (!storeIds.includes(primaryStoreId)) {
    return { ok: false, error: 'Primary store must be one of the selected stores.' };
  }

  const admin = createAdminClient();

  // Look up role to copy default_app_role onto the new user's profile.
  const { data: role, error: roleError } = await admin
    .from('roles')
    .select('id, default_app_role, department')
    .eq('id', roleId)
    .maybeSingle();
  if (roleError || !role) {
    return { ok: false, error: roleError?.message ?? 'Role not found.' };
  }

  // Invite via Supabase Auth admin API. Uses project email template +
  // redirects to /auth/callback on this portal.
  const origin = headers().get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? '';
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      redirectTo: origin ? `${origin}/auth/callback` : undefined,
      data: fullName ? { full_name: fullName } : undefined,
    },
  );
  if (inviteError || !inviteData.user) {
    return { ok: false, error: inviteError?.message ?? 'Invite failed.' };
  }

  const newUserId = inviteData.user.id;

  // Insert the profile row immediately so role/role_id/store survive first login.
  const { error: profileError } = await admin.from('user_profiles').insert({
    id: newUserId,
    email,
    full_name: fullName ?? null,
    role: role.default_app_role,
    role_id: role.id,
    department: role.department,
    primary_store_id: primaryStoreId,
    active: true,
  });
  if (profileError) {
    return { ok: false, error: `Profile insert failed: ${profileError.message}` };
  }

  const accessRows = storeIds.map((store_id) => ({
    user_id: newUserId,
    store_id,
    granted_by: ctx.user.id,
  }));
  const { error: accessError } = await admin.from('user_store_access').insert(accessRows);
  if (accessError) {
    return { ok: false, error: `Store access insert failed: ${accessError.message}` };
  }

  revalidatePath('/admin/users');
  return { ok: true, message: `Invite sent to ${email}.` };
}

const updateSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
  storeIds: z.array(z.string().uuid()).min(1, { message: 'Select at least one store.' }),
  primaryStoreId: z.string().uuid(),
  active: z.enum(['true', 'false']).transform((v) => v === 'true'),
});

export async function updateUser(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const parsed = updateSchema.safeParse({
    userId: formData.get('userId'),
    roleId: formData.get('roleId'),
    storeIds: formData.getAll('storeIds'),
    primaryStoreId: formData.get('primaryStoreId'),
    active: formData.get('active'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }
  const { userId, roleId, storeIds, primaryStoreId, active } = parsed.data;

  if (!storeIds.includes(primaryStoreId)) {
    return { ok: false, error: 'Primary store must be one of the selected stores.' };
  }

  const admin = createAdminClient();

  const { data: role, error: roleError } = await admin
    .from('roles')
    .select('id, default_app_role, department')
    .eq('id', roleId)
    .maybeSingle();
  if (roleError || !role) {
    return { ok: false, error: roleError?.message ?? 'Role not found.' };
  }

  const { error: profileError } = await admin
    .from('user_profiles')
    .update({
      role: role.default_app_role,
      role_id: role.id,
      department: role.department,
      primary_store_id: primaryStoreId,
      active,
    })
    .eq('id', userId);
  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  // Replace store access: delete then insert. Not atomic, but the admin UI
  // is single-admin and low-traffic; a failed re-insert is recoverable by
  // re-saving the form.
  const { error: deleteError } = await admin
    .from('user_store_access')
    .delete()
    .eq('user_id', userId);
  if (deleteError) {
    return { ok: false, error: `Clear access failed: ${deleteError.message}` };
  }

  const ctx = await requireAdmin();
  const accessRows = storeIds.map((store_id) => ({
    user_id: userId,
    store_id,
    granted_by: ctx.user.id,
  }));
  const { error: insertError } = await admin.from('user_store_access').insert(accessRows);
  if (insertError) {
    return { ok: false, error: `Grant access failed: ${insertError.message}` };
  }

  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true, message: 'User updated.' };
}

export async function deactivateAndReturn(formData: FormData) {
  const userId = formData.get('userId');
  if (typeof userId !== 'string') return;
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from('user_profiles').update({ active: false }).eq('id', userId);
  revalidatePath('/admin/users');
  redirect('/admin/users');
}
