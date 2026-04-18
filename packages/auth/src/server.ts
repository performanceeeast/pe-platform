import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@pe/database/server';

/**
 * Fetch the current Supabase user on the server. Returns `null` if the
 * visitor is unauthenticated — use `requireUser` when you want to redirect
 * to `/login` instead.
 */
export async function getUser(): Promise<User | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect('/login');
  return user;
}
