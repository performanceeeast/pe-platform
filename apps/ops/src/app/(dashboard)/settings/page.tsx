import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader } from '@pe/ui';
import { requireUser } from '@pe/auth';
import { createClient } from '@pe/database/server';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = createClient();
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, email, role, department')
    .eq('id', user.id)
    .single();

  return (
    <div className="container max-w-3xl space-y-6 py-4 md:py-8">
      <PageHeader title="Settings" description="Profile and integrations." />

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Synced from your Supabase auth identity.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <Field label="Name" value={profile?.full_name ?? '—'} />
          <Field label="Email" value={profile?.email ?? user.email ?? '—'} />
          <Field label="Role" value={profile?.role ?? 'employee'} />
          <Field label="Department" value={profile?.department ?? '—'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Wire up external systems that feed the dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {/* TODO(calendar-sync): OAuth Google Calendar and persist the
              refresh token; a background job then fills calendar_events_cache. */}
          <IntegrationRow name="Google Calendar" status="Not connected" />
          {/* TODO(notes-pipeline): iPad PDF upload integration. */}
          <IntegrationRow name="iPad notes pipeline" status="Not connected" />
          {/* TODO(claude-task-extraction): Anthropic API key for automated
              task extraction from transcribed notes. */}
          <IntegrationRow name="Claude task extraction" status="Not configured" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>
            Dark mode follows your system preference. A manual toggle lands when the portal
            ships.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function IntegrationRow({ name, status }: { name: string; status: string }) {
  return (
    <div className="flex items-center justify-between border-b pb-3 last:border-b-0 last:pb-0">
      <span className="font-medium">{name}</span>
      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        {status}
      </span>
    </div>
  );
}
