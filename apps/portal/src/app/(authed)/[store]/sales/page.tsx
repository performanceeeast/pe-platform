import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
} from '@pe/ui';
import { requireUserContext, getLandingPath } from '@pe/auth';
import { canManageSalesConfig } from '@/lib/sales-access';

export const metadata: Metadata = { title: 'Sales' };

interface SalesPageProps {
  params: { store: string };
}

export default async function SalesDeptPage({ params }: SalesPageProps) {
  const ctx = await requireUserContext();
  const store = ctx.stores.find((s) => s.slug === params.store);
  if (!store) redirect(getLandingPath(ctx));

  if (!ctx.isAdmin && ctx.role?.department !== 'sales') {
    redirect(getLandingPath(ctx));
  }

  const canSetup = await canManageSalesConfig();
  const roleName = ctx.role?.name ?? 'Employee';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Sales · ${store.name}`}
        description={`Signed in as ${roleName}.`}
        actions={
          canSetup ? (
            <Button asChild>
              <Link href={`/${store.slug}/sales/setup`}>Setup</Link>
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 px-4 md:px-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dashboards are coming</CardTitle>
            <CardDescription>
              Leaderboards, goal progress, deal log, and contests show here once
              the month is configured and salespeople start logging deals.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {canSetup
              ? 'Use Setup to configure this month\u2019s goals, spiffs, contests, and the hit list.'
              : 'Your manager will configure goals and contests for the month.'}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
