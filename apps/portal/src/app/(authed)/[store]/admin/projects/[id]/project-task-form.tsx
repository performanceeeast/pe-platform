'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pe/ui';
import {
  createProjectTask,
  type CreateProjectTaskResult,
} from './actions';

const PRIORITIES = [
  { value: '0', label: 'P0 — Critical' },
  { value: '1', label: 'P1 — High' },
  { value: '2', label: 'P2 — Normal' },
  { value: '3', label: 'P3 — Low' },
] as const;

interface ProjectTaskFormProps {
  projectId: string;
  storeSlug: string;
}

export function ProjectTaskForm({
  projectId,
  storeSlug,
}: ProjectTaskFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [pending, startTransition] = useTransition();
  const [priority, setPriority] = useState('2');
  const [result, setResult] = useState<CreateProjectTaskResult | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setResult(null);

    startTransition(async () => {
      const nextResult = await createProjectTask(formData);
      setResult(nextResult);
      if (nextResult.ok) {
        formRef.current?.reset();
        setPriority('2');
        router.refresh();
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="rounded-lg border bg-card p-4"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="storeSlug" value={storeSlug} />
      <input type="hidden" name="priority" value={priority} />

      <div className="grid gap-3 md:grid-cols-[1fr_9rem_10rem_auto] md:items-end">
        <div>
          <Label htmlFor="projectTaskTitle">Task</Label>
          <Input
            id="projectTaskTitle"
            name="title"
            className="mt-1"
            placeholder="Add a task to this project"
            maxLength={300}
            required
          />
        </div>
        <div>
          <Label>Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="projectTaskDueDate">Due date</Label>
          <Input
            id="projectTaskDueDate"
            name="dueDate"
            type="date"
            className="mt-1"
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Adding…' : 'Add task'}
        </Button>
      </div>

      {result && !result.ok ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {result.error}
        </p>
      ) : null}
    </form>
  );
}
