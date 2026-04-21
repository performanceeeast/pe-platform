import Link from 'next/link';
import type { Metadata } from 'next';
import { PageHeader } from '@pe/ui';
import { createClient } from '@pe/database/server';
import { InviteForm } from './invite-form';

export const metadata: Metadata = { title: 'User management' };

export default async function AdminUsersPage() {
  const supabase = createClient();

  const [profilesRes, rolesRes, storesRes, accessRes] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('id, full_name, email, role, role_id, primary_store_id, active')
      .order('active', { ascending: false })
      .order('email'),
    supabase.from('roles').select('id, slug, name, department').order('name'),
    supabase.from('stores').select('id, slug, name').eq('active', true).order('name'),
    supabase.from('user_store_access').select('user_id, store_id'),
  ]);

  const profiles = profilesRes.data ?? [];
  const roles = rolesRes.data ?? [];
  const stores = storesRes.data ?? [];
  const access = accessRes.data ?? [];

  const roleById = new Map(roles.map((r) => [r.id, r]));
  const storeById = new Map(stores.map((s) => [s.id, s]));
  const accessByUser = new Map<string, string[]>();
  for (const row of access) {
    const list = accessByUser.get(row.user_id) ?? [];
    list.push(row.store_id);
    accessByUser.set(row.user_id, list);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User management"
        description="Invite new team members, assign roles, and manage store access."
      />

      <div className="space-y-6 px-4 pb-8 md:px-6">
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Invite a user
          </h2>
          <InviteForm roles={roles} stores={stores} />
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            All users ({profiles.length})
          </h2>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Stores</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {profiles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                      No users yet. Invite someone above.
                    </td>
                  </tr>
                ) : (
                  profiles.map((p) => {
                    const role = p.role_id ? roleById.get(p.role_id) : null;
                    const userStores = (accessByUser.get(p.id) ?? [])
                      .map((id) => storeById.get(id)?.name)
                      .filter(Boolean)
                      .join(', ');
                    return (
                      <tr key={p.id} className="border-t">
                        <td className="px-3 py-2">{p.full_name ?? '—'}</td>
                        <td className="px-3 py-2 font-mono text-xs">{p.email ?? '—'}</td>
                        <td className="px-3 py-2">{role?.name ?? p.role}</td>
                        <td className="px-3 py-2">{userStores || '—'}</td>
                        <td className="px-3 py-2">
                          {p.active ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                              Active
                            </span>
                          ) : (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Link
                            href={`/admin/users/${p.id}`}
                            className="text-pe-red-500 hover:underline"
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
