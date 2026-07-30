import { unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { PageHeader } from '@pe/ui';
import { getLandingPath, requireUserContext } from '@pe/auth';
import { createClient } from '@pe/database/server';
import { KanbanBoard, type KanbanTask } from './kanban-board';

export const metadata: Metadata = { title: 'Kanban' };

interface KanbanPageProps {
  params: { store: string };
}

export default async function KanbanPage({ params }: KanbanPageProps) {
  noStore();
  const ctx = await requireUserContext();
  const store = ctx.stores.find((candidate) => candidate.slug === params.store);
  if (!store) redirect(getLandingPath(ctx));

  const supabase = createClient();
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, description, department, priority, status, due_date')
    .in('status', ['inbox', 'today', 'this_week', 'waiting', 'done'])
    .order('priority', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false });

  const boardTasks: KanbanTask[] = (tasks ?? []).map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    department: task.department,
    priority: task.priority,
    status: task.status as KanbanTask['status'],
    dueDate: task.due_date,
  }));

  return (
    <div className="container max-w-[96rem] py-4 md:py-8">
      <PageHeader
        title="Kanban"
        description="Inbox, current work, waiting items, and completed tasks in one live board."
      />
      <div className="mt-6">
        <KanbanBoard initialTasks={boardTasks} storeSlug={store.slug} />
      </div>
    </div>
  );
}
