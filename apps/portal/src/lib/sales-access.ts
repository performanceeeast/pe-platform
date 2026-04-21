import { requireUserContext } from '@pe/auth';
import { createClient } from '@pe/database/server';

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
