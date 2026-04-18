import { unstable_noStore as noStore } from 'next/cache';
import type { Metadata } from 'next';
import { endOfDay, startOfDay } from 'date-fns';
import { PageHeader } from '@pe/ui';
import { requireUser } from '@pe/auth';
import { createClient } from '@pe/database/server';
import { QuickAdd } from './quick-add';
import { TaskRow, type TaskRowData } from '@/components/task-row';
import { greetingFor, formatDayHeading, isOverdue } from '@/lib/date';

export const metadata: Metadata = { title: 'Today' };

export default async function TodayPage() {
  noStore();
  const user = await requireUser();
  const supabase = createClient();

  const now = new Date();
  const todayStart = startOfDay(now).toISOString();
  const todayEnd = endOfDay(now).toISOString();

  const { data: openTasks } = await supabase
    .from('tasks')
    .select('id, title, description, department, priority, status, due_date, completed_at')
    .in('status', ['inbox', 'today', 'this_week'])
    .order('priority', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false })
    .returns<TaskRowData[]>();

  const { data: doneToday } = await supabase
    .from('tasks')
    .select('id')
    .eq('status', 'done')
    .gte('completed_at', todayStart)
    .lte('completed_at', todayEnd);

  const { data: eventsToday } = await supabase
    .from('calendar_events_cache')
    .select('id, title, start_time, end_time, location')
    .gte('start_time', todayStart)
    .lte('start_time', todayEnd)
    .order('start_time', { ascending: true });

  const tasks = openTasks ?? [];
  const highP = tasks.filter(
    (t) =>
      t.priority <= 1 &&
      (isOverdue(t.due_date, now) ||
        t.status === 'today' ||
        (t.due_date && new Date(t.due_date) <= new Date(todayEnd))),
  );
  const normalP = tasks.filter((t) => t.priority >= 2 && t.status === 'today');
  const overdueIds = new Set(highP.filter((t) => isOverdue(t.due_date, now)).map((t) => t.id));

  const totalOpen = tasks.length;
  const overdueCount = tasks.filter((t) => isOverdue(t.due_date, now)).length;
  const doneCount = doneToday?.length ?? 0;

  return (
    <div className="container max-w-5xl space-y-8 py-4 md:py-8">
      <PageHeader
        title={`${greetingFor(now)}, Matthew`}
        description={formatDayHeading(now)}
      />

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick add
        </h2>
        <QuickAdd />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            P0 / P1 — Critical &amp; High
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
              {highP.length}
            </span>
          </h2>
          {highP.length === 0 ? (
            <p className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
              Nothing critical right now. Good place to be.
            </p>
          ) : (
            <div className="space-y-2">
              {highP.map((task) => (
                <TaskRow key={task.id} task={task} overdue={overdueIds.has(task.id)} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            P2 / P3 — Today
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
              {normalP.length}
            </span>
          </h2>
          {normalP.length === 0 ? (
            <p className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
              Use the quick-add above to drop tasks here.
            </p>
          ) : (
            <div className="space-y-2">
              {normalP.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          Calendar
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
            {eventsToday?.length ?? 0}
          </span>
        </h2>
        {/* TODO(calendar-sync): wire Google Calendar → calendar_events_cache so this
            populates automatically on each sign-in. */}
        {!eventsToday || eventsToday.length === 0 ? (
          <p className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            Google Calendar isn&apos;t connected yet. Settings → Integrations will add it.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {eventsToday.map((e) => (
              <li key={e.id} className="flex items-baseline gap-3 p-3 text-sm">
                <span className="tabular-nums text-xs text-muted-foreground">
                  {new Date(e.start_time).toLocaleTimeString(undefined, {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{e.title}</span>
                {e.location ? (
                  <span className="truncate text-xs text-muted-foreground">{e.location}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="flex flex-wrap gap-4 border-t pt-4 text-xs text-muted-foreground">
        <span>{totalOpen} open</span>
        <span className={overdueCount > 0 ? 'font-medium text-red-600' : undefined}>
          {overdueCount} overdue
        </span>
        <span>{doneCount} completed today</span>
        <span className="ml-auto text-muted-foreground/60">Signed in as {user.email}</span>
      </footer>
    </div>
  );
}
