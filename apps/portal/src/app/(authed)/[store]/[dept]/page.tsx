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

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${label} · ${store.name}`}
        description={`Signed in as ${roleName}.`}
      />

      <div className="px-4 md:px-6">
        <Card>
          <CardHeader>
            <CardTitle>{label} dashboard — coming soon</CardTitle>
            <CardDescription>
              Real {label.toLowerCase()} tools (pipeline, board, KPIs) land here as
              the next departments come online. Sales is live now; F&I has its own
              dashboard at <code>/{store.slug}/fni</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            For now this page just confirms routing and access control are working
            for the {label.toLowerCase()} team. Reach out to Matthew if you need a
            specific report or workflow prioritized.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
