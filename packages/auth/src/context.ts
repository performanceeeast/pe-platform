import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@pe/database/server';
import type { Database } from '@pe/database/types';

type Tables = Database['public']['Tables'];

export type Profile = Tables['user_profiles']['Row'];
export type Role = Tables['roles']['Row'];
export type Store = Tables['stores']['Row'];

export interface UserContext {
  user: User;
  profile: Profile;
  role: Role | null;
  stores: Store[];
  primaryStore: Store | null;
  isAdmin: boolean;
}

/**
 * Resolve the full portal context for the current request: profile, assigned
 * role, the stores this user can switch between, and their primary store.
 * Returns null when unauthenticated — callers that require auth should use
 * `requireUserContext` instead.
 */
export async function getUserContext(): Promise<UserContext | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) return null;

  const isAdmin = profile.role === 'owner' || profile.role === 'gm';

  const [roleRes, storesRes, accessRes] = await Promise.all([
    profile.role_id
      ? supabase.from('roles').select('*').eq('id', profile.role_id).maybeSingle()
      : Promise.resolve({ data: null as Role | null }),
    supabase.from('stores').select('*').eq('active', true).order('name'),
    supabase.from('user_store_access').select('store_id').eq('user_id', user.id),
  ]);

  const role = (roleRes.data as Role | null) ?? null;
  const allStores = (storesRes.data as Store[] | null) ?? [];

  let stores: Store[];
  if (isAdmin) {
    stores = allStores;
  } else {
    const accessIds = new Set(
      ((accessRes.data as Array<{ store_id: string }> | null) ?? []).map(
        (row) => row.store_id,
      ),
    );
    stores = allStores.filter((s) => accessIds.has(s.id));
  }

  const primaryStore =
    stores.find((s) => s.id === profile.primary_store_id) ?? stores[0] ?? null;

  return { user, profile, role, stores, primaryStore, isAdmin };
}

/**
 * Same as `getUserContext`, but redirects to `/login` when unauthenticated.
 */
export async function requireUserContext(): Promise<UserContext> {
  const ctx = await getUserContext();
  if (!ctx) redirect('/login');
  return ctx;
}
