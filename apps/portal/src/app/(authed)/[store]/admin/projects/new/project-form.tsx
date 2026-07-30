'use client';

import { useState, useTransition } from 'react';
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
  Textarea,
} from '@pe/ui';
import { createProject, type CreateProjectResult } from './actions';

const DEPARTMENTS = [
  { value: 'sales', label: 'Sales' },
  { value: 'service', label: 'Service' },
  { value: 'parts', label: 'Parts' },
  { value: 'fni', label: 'F&I' },
  { value: 'other', label: 'Other' },
] as const;

const STATUSES = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On hold' },
] as const;

interface ProjectFormProps {
  storeSlug: string;
}

export function ProjectForm({ storeSlug }: ProjectFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CreateProjectResult | null>(null);
  const [department, setDepartment] =
    useState<(typeof DEPARTMENTS)[number]['value']>('other');
  const [status, setStatus] = useState<(typeof STATUSES)[number]['value']>('planning');

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setResult(null);

    startTransition(async () => {
      const nextResult = await createProject(formData);
      setResult(nextResult);
      if (nextResult.ok) {
        router.push(`/${storeSlug}/admin/projects/${nextResult.projectId}`);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-5">
      <input type="hidden" name="storeSlug" value={storeSlug} />
      <input type="hidden" name="department" value={department} />
      <input type="hidden" name="status" value={status} />

      <div>
        <Label htmlFor="name">Project name</Label>
        <Input
          id="name"
          name="name"
          className="mt-1"
          maxLength={200}
          autoFocus
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          className="mt-1"
          rows={4}
          maxLength={2000}
          placeholder="What outcome should this project produce?"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Department</Label>
          <Select
            value={department}
            onValueChange={(value) =>
              setDepartment(value as (typeof DEPARTMENTS)[number]['value'])
            }
          >
            <SelectTrigger className="mt-1">
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

        <div>
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(value) =>
              setStatus(value as (typeof STATUSES)[number]['value'])
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" name="startDate" type="date" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="targetEndDate">Target end date</Label>
          <Input
            id="targetEndDate"
            name="targetEndDate"
            type="date"
            className="mt-1"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t pt-4">
        <p className="text-sm text-muted-foreground">
          Tasks can be linked after the project is created.
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating…' : 'Create project'}
        </Button>
      </div>

      {result && !result.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      ) : null}
    </form>
  );
}
