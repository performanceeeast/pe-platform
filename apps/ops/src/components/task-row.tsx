'use client';

import { useOptimistic, useTransition } from 'react';
import { format } from 'date-fns';
import {
  Checkbox,
  DepartmentBadge,
  PriorityIndicator,
  cn,
  toPriority,
  type Department,
} from '@pe/ui';
import { completeTask, reopenTask } from '@/app/actions/tasks';

export interface TaskRowData {
  id: string;
  title: string;
  description: string | null;
  department: Department;
  priority: number;
  status: 'inbox' | 'today' | 'this_week' | 'waiting' | 'done' | 'archived';
  due_date: string | null;
  completed_at: string | null;
}

export function TaskRow({ task, overdue = false }: { task: TaskRowData; overdue?: boolean }) {
  const [optimisticDone, setOptimisticDone] = useOptimistic(task.status === 'done');
  const [, startTransition] = useTransition();

  function toggle(next: boolean) {
    startTransition(async () => {
      setOptimisticDone(next);
      const result = next ? await completeTask(task.id) : await reopenTask(task.id);
      if (!result.ok) setOptimisticDone(!next);
    });
  }

  const priority = toPriority(task.priority);
  const due = task.due_date ? new Date(task.due_date) : null;

  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/40',
        overdue && !optimisticDone && 'border-red-300 bg-red-50/50 dark:bg-red-950/20',
      )}
    >
      <Checkbox
        checked={optimisticDone}
        onCheckedChange={(v) => toggle(v === true)}
        className="mt-0.5 h-5 w-5"
        aria-label={optimisticDone ? `Reopen ${task.title}` : `Complete ${task.title}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <PriorityIndicator priority={priority} />
          <DepartmentBadge department={task.department} />
          {due ? (
            <span
              className={cn(
                'text-xs',
                overdue && !optimisticDone ? 'text-red-600' : 'text-muted-foreground',
              )}
            >
              {format(due, 'MMM d')}
            </span>
          ) : null}
        </div>
        <p
          className={cn(
            'mt-1 break-words text-sm font-medium',
            optimisticDone && 'text-muted-foreground line-through',
          )}
        >
          {task.title}
        </p>
        {task.description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{task.description}</p>
        ) : null}
      </div>
    </div>
  );
}
