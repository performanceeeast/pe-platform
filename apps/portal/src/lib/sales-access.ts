import { requireUserContext } from '@pe/auth';
import { createClient } from '@pe/database/server';

export interface SalespersonProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}

const SALESPERSON_GRANT_SLUGS = ['salesperson', 'sales_associate'];

/**
 * Resolve the list of users who should appear in salesperson dropdowns:
 *   - active profiles whose primary role is in the sales department, plus
 *   - active profiles with a user_role_grants row for the salesperson /
 *     sales_associate role (so the Owner or anyone else opted-in via the
 *     master user list shows up too).
 */
export async function listSalespeople(): Promise<SalespersonProfile[]> {
  const supabase = createClient();

  const [primaryRes, salespersonRolesRes] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('id, full_name, email, role:roles!inner(department)')
      .eq('active', true)
      .eq('role.department', 'sales')
      .order('full_name'),
    supabase
      .from('roles')
      .select('id')
      .in('slug', SALESPERSON_GRANT_SLUGS),
  ]);

  const byId = new Map<string, SalespersonProfile>();
  for (const row of primaryRes.data ?? []) {
    byId.set(row.id, { id: row.id, full_name: row.full_name, email: row.email });
  }

  const grantRoleIds = (salespersonRolesRes.data ?? []).map((r) => r.id);
  if (grantRoleIds.length > 0) {
    const { data: grants } = await supabase
      .from('user_role_grants')
      .select('user_id')
      .in('role_id', grantRoleIds);

    const grantUserIds = Array.from(
      new Set((grants ?? []).map((g) => g.user_id).filter((id): id is string => Boolean(id))),
    ).filter((id) => !byId.has(id));

    if (grantUserIds.length > 0) {
      const { data: granted } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, active')
        .in('id', grantUserIds)
        .eq('active', true);
      for (const row of granted ?? []) {
        byId.set(row.id, { id: row.id, full_name: row.full_name, email: row.email });
      }
    }
  }

  return Array.from(byId.values()).sort((a, b) => {
    const an = (a.full_name ?? a.email ?? '').toLowerCase();
    const bn = (b.full_name ?? b.email ?? '').toLowerCase();
    return an.localeCompare(bn);
  });
}

/**
 * True when the current user can edit sales monthly config (goals, spiffs,
 * contests, hit list, promos). Admins (owner / gm) and anyone holding the
 * sales_manager role — primary or granted via user_role_grants — qualify.
 *
 * Mirrors the `current_user_can_manage_sales_config` RLS helper so we can
 * hide/show UI affordances before the DB rejects the write.
 */
export async function canManageSalesConfig(): Promise<boolean> {
  const ctx = await requireUserContext();
  if (ctx.isAdmin) return true;

  const supabase = createClient();
  const { data } = await supabase.rpc('current_user_has_role_slug', {
    p_slug: 'sales_manager',
  });
  return data === true;
}

/**
 * True when any of the supplied role slugs match the current user (primary
 * role or user_role_grants). Admins always pass. One round-trip per slug —
 * fine for a 1-3 slug check, swap to a single SQL view if it grows.
 */
export async function hasAnyRole(slugs: string[]): Promise<boolean> {
  const ctx = await requireUserContext();
  if (ctx.isAdmin) return true;
  if (ctx.role && slugs.includes(ctx.role.slug)) return true;

  const supabase = createClient();
  for (const slug of slugs) {
    const { data } = await supabase.rpc('current_user_has_role_slug', { p_slug: slug });
    if (data === true) return true;
  }
  return false;
}
