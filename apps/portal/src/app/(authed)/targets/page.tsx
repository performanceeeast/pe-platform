import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader } from '@pe/ui';
import { requireUserContext } from '@pe/auth';

export const metadata: Metadata = { title: 'Targets' };

export default async function TargetsPage() {
  const ctx = await requireUserContext();
  const isManager = ctx.role?.rank === 'manager' || ctx.isAdmin;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Targets"
        description={
          isManager
            ? 'Your own targets and the targets you set for your team.'
            : 'Targets set for you by your manager.'
        }
      />
      <div className="px-4 pb-8 md:px-6">
        <Card>
          <CardHeader>
            <CardTitle>No targets yet</CardTitle>
            <CardDescription>
              Pay plans drive target assignment. Once pay plans are finalized and
              set up by an administrator, goals and actuals will appear here.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Check back later.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
