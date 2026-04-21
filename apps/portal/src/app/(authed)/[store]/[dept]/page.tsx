import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader } from '@pe/ui';
import { requireUserContext, getLandingPath } from '@pe/auth';

// Note: 'admin' has its own static route at /[store]/admin/*, which takes
// precedence over this dynamic segment. Keep it out of the valid list so an
// accidental /foo/admin that misses the static route still 404s.
const VALID_DEPARTMENTS = ['sales', 'service', 'parts', 'fni'] as const;
type DepartmentSlug = (typeof VALID_DEPARTMENTS)[number];

const DEPARTMENT_LABELS: Record<DepartmentSlug, string> = {
  sales: 'Sales',
  service: 'Service',
  parts: 'Parts',
  fni: 'F&I',
};

interface DepartmentPageProps {
  params: { store: string; dept: string };
}

export async function generateMetadata({ params }: DepartmentPageProps): Promise<Metadata> {
  if (!VALID_DEPARTMENTS.includes(params.dept as DepartmentSlug)) return {};
  return {
    title: `${DEPARTMENT_LABELS[params.dept as DepartmentSlug]} — ${params.store}`,
  };
}

export default async function DepartmentPage({ params }: DepartmentPageProps) {
  if (!VALID_DEPARTMENTS.includes(params.dept as DepartmentSlug)) notFound();
  const dept = params.dept as DepartmentSlug;

  const ctx = await requireUserContext();
  const store = ctx.stores.find((s) => s.slug === params.store);
  if (!store) redirect(getLandingPath(ctx));

  // Non-admins can only view their own department.
  if (!ctx.isAdmin && ctx.role?.department !== dept) {
    redirect(getLandingPath(ctx));
  }

  const label = DEPARTMENT_LABELS[dept];
  const roleName = ctx.role?.name ?? 'Employee';
  const isManager = ctx.role?.rank === 'manager' || ctx.isAdmin;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${label} · ${store.name}`}
        description={`Signed in as ${roleName}.`}
      />

      <div className="grid gap-4 px-4 md:px-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your dashboard is coming</CardTitle>
            <CardDescription>
              Real {label.toLowerCase()} content (pipeline, board, KPIs) lands here as
              we migrate features in. For now this is a placeholder so routing and
              access control can be verified end-to-end.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Store: <span className="font-medium text-foreground">{store.name}</span>
            <br />
            Department: <span className="font-medium text-foreground">{label}</span>
            <br />
            Role: <span className="font-medium text-foreground">{roleName}</span>
          </CardContent>
        </Card>

        {isManager ? (
          <Card>
            <CardHeader>
              <CardTitle>Targets &amp; goals</CardTitle>
              <CardDescription>
                Pay-plan-driven targets for you and your team appear here. Set up
                begins once pay plans are wired in.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Nothing to show yet.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
