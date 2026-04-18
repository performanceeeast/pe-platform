'use client';

import { useRef, useState, useTransition } from 'react';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DEPARTMENTS,
} from '@pe/ui';
import { createTask } from '@/app/actions/tasks';

const DEPARTMENT_LABELS: Record<(typeof DEPARTMENTS)[number], string> = {
  sales: 'Sales',
  service: 'Service',
  parts: 'Parts',
  fni: 'F&I',
  h2_grow: 'H2Grow',
  personal: 'Personal',
  other: 'Other',
};

const PRIORITIES: { value: '0' | '1' | '2' | '3'; label: string }[] = [
  { value: '0', label: 'P0 — Critical' },
  { value: '1', label: 'P1 — High' },
  { value: '2', label: 'P2 — Normal' },
  { value: '3', label: 'P3 — Low' },
];

export function QuickAdd() {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [priority, setPriority] = useState<'0' | '1' | '2' | '3'>('2');
  const [department, setDepartment] = useState<(typeof DEPARTMENTS)[number]>('other');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    formData.set('priority', priority);
    formData.set('department', department);
    formData.set('status', 'today');
    startTransition(async () => {
      const result = await createTask(formData);
      if (result.ok) {
        formRef.current?.reset();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form ref={formRef} action={submit} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          name="title"
          placeholder="Add a task — press Enter"
          required
          autoComplete="off"
          className="flex-1"
        />
        <div className="flex gap-2">
          <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
            <SelectTrigger className="w-[7.5rem]" aria-label="Priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={department}
            onValueChange={(v) => setDepartment(v as (typeof DEPARTMENTS)[number])}
          >
            <SelectTrigger className="w-[8rem]" aria-label="Department">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {DEPARTMENT_LABELS[d]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" size="touch" disabled={isPending}>
            {isPending ? 'Adding…' : 'Add'}
          </Button>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
