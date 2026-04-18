import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHeader, DepartmentBadge } from '@pe/ui';
import { requireUser } from '@pe/auth';
import { createClient } from '@pe/database/server';
import { TaskRow, type TaskRowData } from '@/components/task-row';

export const metadata: Metadata = { title: 'Project' };

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  await requireUser();
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
      <PageHeader
        title={project.name}
        description={project.description ?? undefined}
        actions={<DepartmentBadge department={project.department} />}
      />
      <section className="mt-6 space-y-2">
        <h2 className="text-sm font-semibold">Tasks</h2>
        {!tasks || tasks.length === 0 ? (
          <p className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            No tasks linked to this project yet.
          </p>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
