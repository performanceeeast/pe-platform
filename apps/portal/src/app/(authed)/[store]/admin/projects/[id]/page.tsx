import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PageHeader, DepartmentBadge } from '@pe/ui';
import { getLandingPath, requireUserContext } from '@pe/auth';
import { createClient } from '@pe/database/server';
import { TaskRow, type TaskRowData } from '@/components/task-row';
import { ProjectTaskForm } from './project-task-form';

export const metadata: Metadata = { title: 'Project' };

interface ProjectDetailPageProps {
  params: { store: string; id: string };
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const ctx = await requireUserContext();
  const store = ctx.stores.find((candidate) => candidate.slug === params.store);
  if (!store) redirect(getLandingPath(ctx));

  const supabase = createClient();

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!project) notFound();

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, description, department, priority, status, due_date, completed_at')
    .eq('project_id', params.id)
    .order('priority', { ascending: true })
    .returns<TaskRowData[]>();

  return (
    <div className="container max-w-4xl py-4 md:py-8">
      <Link
        href={`/${store.slug}/admin/projects`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← All projects
      </Link>
      <div className="mt-2">
        <PageHeader
          title={project.name}
          description={project.description ?? undefined}
          actions={<DepartmentBadge department={project.department} />}
        />
      </div>
      <section className="mt-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Tasks</h2>
          <p className="text-xs text-muted-foreground">
            New tasks inherit this project&apos;s department and start in Today.
          </p>
        </div>

        <ProjectTaskForm projectId={project.id} storeSlug={store.slug} />

        {!tasks || tasks.length === 0 ? (
          <p className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            No tasks linked to this project yet.
          </p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
