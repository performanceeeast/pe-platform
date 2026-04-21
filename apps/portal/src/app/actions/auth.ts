'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@pe/database/server';

const emailSchema = z.object({
  email: z.string().email({ message: 'Enter a valid email address.' }),
});

export type MagicLinkResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function sendMagicLink(formData: FormData): Promise<MagicLinkResult> {
  const parsed = emailSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid email.' };
  }

  const origin = headers().get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? '';
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, message: `Check ${parsed.data.email} for a sign-in link.` };
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
