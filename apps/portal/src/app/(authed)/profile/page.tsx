import { unstable_noStore as noStore } from 'next/cache';
import type { Metadata } from 'next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
} from '@pe/ui';
import { requireUserContext } from '@pe/auth';
import { createClient } from '@pe/database/server';
import { ProfileForm } from './profile-form';

export const metadata: Metadata = { title: 'Profile' };

const SALESPERSON_GRANT_SLUGS = ['salesperson', 'sales_associate'];

export default async function ProfilePage() {
  noStore();
  const ctx = await requireUserContext();
  const supabase = createClient();

  // Surface whether the salesperson capability is on for this user. Mirrors
  // the toggle on /admin/users so the user can see what they show up as.
  const isPrimarySales = ctx.role
    ? SALESPERSON_GRANT_SLUGS.includes(ctx.role.slug)
    : false;

  let hasSalespersonGrant = false;
  if (!isPrimarySales) {
    const { data: salesRoles } = await supabase
      .from('roles')
      .select('id')
      .in('slug', SALESPERSON_GRANT_SLUGS);
    const ids = (salesRoles ?? []).map((r) => r.id);
    if (ids.length > 0) {
      const { data: grants } = await supabase
        .from('user_role_grants')
        .select('role_id')
        .eq('user_id', ctx.user.id)
        .in('role_id', ids)
        .limit(1);
      hasSalespersonGrant = (grants ?? []).length > 0;
    }
  }

  const isSalesperson = isPrimarySales || hasSalespersonGrant;
  const storeNames = ctx.stores.map((s) => s.name).join(', ') || '—';
  const primaryStoreName = ctx.primaryStore?.name ?? '—';
  const initialFullName = ctx.profile.full_name ?? '';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Your account details. Email, role, and store access are managed by an admin."
      />

      <div className="grid gap-4 px-4 pb-8 md:px-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit your name</CardTitle>
            <CardDescription>
              Used across deal lists, leaderboards, and dropdowns. This is the
              one field you can change yourself.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm initialFullName={initialFullName} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
            <CardDescription>
              Read-only. Ask an admin if anything looks wrong.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="divide-y text-sm">
              <Row label="Email" value={ctx.user.email ?? '—'} mono />
              <Row label="Role" value={ctx.role?.name ?? ctx.profile.role ?? '—'} />
              <Row label="Department" value={ctx.role?.department ?? '—'} />
              <Row label="Primary store" value={primaryStoreName} />
              <Row label="Stores" value={storeNames} />
              <Row
                label="Salesperson access"
                value={
                  isSalesperson
                    ? isPrimarySales
                      ? 'Yes (via primary role)'
                      : 'Yes (granted)'
                    : 'No'
                }
              />
              <Row label="Status" value={ctx.profile.active ? 'Active' : 'Inactive'} />
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className={mono ? 'font-mono text-xs' : 'text-sm font-medium'}>{value}</dd>
    </div>
  );
}
