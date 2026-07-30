'use client';

import { useMemo, useState, useTransition } from 'react';
import { format } from 'date-fns';
import {
  DepartmentBadge,
  PriorityIndicator,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
  toPriority,
  type Department,
} from '@pe/ui';
import { moveTask } from './actions';

type BoardStatus = 'inbox' | 'today' | 'this_week' | 'waiting' | 'done';

const COLUMNS: Array<{
  status: BoardStatus;
  label: string;
  empty: string;
}> = [
  { status: 'inbox', label: 'Inbox', empty: 'Inbox is clear.' },
  { status: 'today', label: 'Today', empty: 'Nothing scheduled today.' },
  { status: 'this_week', label: 'This week', empty: 'No tasks queued this week.' },
  { status: 'waiting', label: 'Waiting', empty: 'Nothing waiting on others.' },
  { status: 'done', label: 'Done', empty: 'No completed tasks yet.' },
];

const DEPARTMENTS: Array<{ value: 'all' | Department; label: string }> = [
  { value: 'all', label: 'All departments' },
  { value: 'sales', label: 'Sales' },
  { value: 'service', label: 'Service' },
  { value: 'parts', label: 'Parts' },
  { value: 'fni', label: 'F&I' },
  { value: 'other', label: 'Other' },
];

export interface KanbanTask {
  id: string;
  title: string;
  description: string | null;
  department: Department;
  priority: number;
  status: BoardStatus;
  dueDate: string | null;
}

interface KanbanBoardProps {
  initialTasks: KanbanTask[];
  storeSlug: string;
}

export function KanbanBoard({ initialTasks, storeSlug }: KanbanBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [department, setDepartment] = useState<'all' | Department>('all');
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filteredTasks = useMemo(
    () =>
      department === 'all'
        ? tasks
        : tasks.filter((task) => task.department === department),
    [department, tasks],
  );

  function move(taskId: string, nextStatus: BoardStatus) {
    const previousTasks = tasks;
    setError(null);
    setPendingTaskId(taskId);
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, status: nextStatus } : task,
      ),
    );

    const formData = new FormData();
    formData.set('taskId', taskId);
    formData.set('storeSlug', storeSlug);
    formData.set('status', nextStatus);

    startTransition(async () => {
      const result = await moveTask(formData);
      if (!result.ok) {
        setTasks(previousTasks);
        setError(result.error);
      }
      setPendingTaskId(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Move tasks with the status control on each card.
        </p>
        <Select
          value={department}
          onValueChange={(value) => setDepartment(value as 'all' | Department)}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEPARTMENTS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto pb-3">
        <div className="grid min-w-[72rem] grid-cols-5 gap-3">
          {COLUMNS.map((column) => {
            const columnTasks = filteredTasks
              .filter((task) => task.status === column.status)
              .sort(
                (a, b) =>
                  a.priority - b.priority ||
                  (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'),
              );

            return (
              <section
                key={column.status}
                className="min-h-[18rem] rounded-lg border bg-muted/20 p-3"
              >
                <h2 className="mb-3 flex items-center justify-between text-sm font-semibold">
                  {column.label}
                  <span className="rounded-full bg-background px-2 py-0.5 text-xs font-normal text-muted-foreground">
                    {columnTasks.length}
                  </span>
                </h2>

                {columnTasks.length === 0 ? (
                  <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                    {column.empty}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        pending={pendingTaskId === task.id}
                        onMove={(status) => move(task.id, status)}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TaskCard({
  task,
  pending,
  onMove,
}: {
  task: KanbanTask;
  pending: boolean;
  onMove: (status: BoardStatus) => void;
}) {
  return (
    <article
      className={cn(
        'rounded-md border bg-card p-3 shadow-sm',
        pending && 'opacity-60',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <PriorityIndicator priority={toPriority(task.priority)} />
        <DepartmentBadge department={task.department} />
        {task.dueDate ? (
          <span className="text-xs text-muted-foreground">
            {format(new Date(task.dueDate), 'MMM d')}
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          'mt-2 break-words text-sm font-medium',
          task.status === 'done' && 'text-muted-foreground line-through',
        )}
      >
        {task.title}
      </p>
      {task.description ? (
        <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
          {task.description}
        </p>
      ) : null}
      <Select
        value={task.status}
        onValueChange={(value) => onMove(value as BoardStatus)}
        disabled={pending}
      >
        <SelectTrigger className="mt-3 h-8 text-xs" aria-label={`Move ${task.title}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COLUMNS.map((column) => (
            <SelectItem key={column.status} value={column.status}>
              {column.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </article>
  );
}
