import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PageHeader } from '@pe/ui';
import { createClient } from '@pe/database/server';
import { EditForm } from './edit-form';

export const metadata: Metadata = { title: 'Edit user' };

interface EditUserPageProps {
  params: { id: string };
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const supabase = createClient();

  const [profileRes, rolesRes, storesRes, accessRes] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('id, full_name, email, role, role_id, primary_store_id, active')
      .eq('id', params.id)
      .maybeSingle(),
    supabase.from('roles').select('id, name, department').order('name'),
    supabase.from('stores').select('id, slug, name').eq('active', true).order('name'),
    supabase
      .from('user_store_access')
      .select('store_id')
      .eq('user_id', params.id),
  ]);

  const profile = profileRes.data;
  if (!profile) notFound();

  const roles = rolesRes.data ?? [];
  const stores = storesRes.data ?? [];
  const accessIds = (accessRes.data ?? []).map((a) => a.store_id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={profile.full_name ?? profile.email ?? 'User'}
        description={profile.email ?? undefined}
      />

      <div className="max-w-2xl space-y-6 px-4 pb-8 md:px-6">
        <Link
          href="/admin/users"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to users
        </Link>

        <EditForm
          userId={profile.id}
          initial={{
            roleId: profile.role_id,
            storeIds: accessIds,
            primaryStoreId: profile.primary_store_id,
            active: profile.active,
          }}
          roles={roles}
          stores={stores}
        />
      </div>
    </div>
  );
}
