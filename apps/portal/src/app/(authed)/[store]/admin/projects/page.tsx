import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader, Card, CardContent, CardHeader, CardTitle, DepartmentBadge } from '@pe/ui';
import { requireUserContext } from '@pe/auth';
import { createClient } from '@pe/database/server';

export const metadata: Metadata = { title: 'Projects' };

interface ProjectsPageProps {
  params: { store: string };
}

export default async function ProjectsPage({ params }: ProjectsPageProps) {
  await requireUserContext();
  const supabase = createClient();
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, description, department, status, target_end_date')
    .order('created_at', { ascending: false });

  return (
    <div className="container max-w-5xl py-4 md:py-8">
      <PageHeader
        title="Projects"
        description="Buckets that link related tasks across departments."
      />
      {!projects || projects.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed bg-muted/20 p-12 text-center text-sm text-muted-foreground">
          No projects yet. Create one from the quick-add or Kanban view (coming soon).
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <li key={p.id}>
              <Link href={`/${params.store}/admin/projects/${p.id}`}>
                <Card className="transition-colors hover:bg-accent/40">
                  <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <DepartmentBadge department={p.department} />
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <p className="line-clamp-2">{p.description ?? '—'}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs">
                      <span className="capitalize">{p.status.replace('_', ' ')}</span>
                      {p.target_end_date ? (
                        <span>
                          Target {new Date(p.target_end_date).toLocaleDateString()}
                        </span>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
