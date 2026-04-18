import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHeader, DEPARTMENTS, type Department } from '@pe/ui';
import { requireUser } from '@pe/auth';
import { createClient } from '@pe/database/server';
import { TaskRow, type TaskRowData } from '@/components/task-row';

const DEPT_LABELS: Record<Department, string> = {
  sales: 'Sales',
  service: 'Service',
  parts: 'Parts',
  fni: 'F&I',
  h2_grow: 'H2Grow',
  personal: 'Personal',
  other: 'Other',
};

export const metadata: Metadata = { title: 'Department' };

export default async function DepartmentPage({ params }: { params: { dept: string } }) {
  if (!(DEPARTMENTS as readonly string[]).includes(params.dept)) notFound();
  const dept = params.dept as Department;

  await requireUser();
  const supabase = createClient();
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, description, department, priority, status, due_date, completed_at')
    .eq('department', dept)
    .neq('status', 'archived')
    .order('status', { ascending: true })
    .order('priority', { ascending: true })
    .returns<TaskRowData[]>();

  return (
    <div className="container max-w-4xl py-4 md:py-8">
      <PageHeader
        title={`${DEPT_LABELS[dept]} department`}
        description={`Open and waiting tasks for ${DEPT_LABELS[dept]}.`}
      />
      <div className="mt-6 space-y-2">
        {!tasks || tasks.length === 0 ? (
          <p className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            No open tasks for {DEPT_LABELS[dept]}.
          </p>
        ) : (
          tasks.map((t) => <TaskRow key={t.id} task={t} />)
        )}
      </div>
    </div>
  );
}
