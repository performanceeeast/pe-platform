'use client';

import { useState, useTransition } from 'react';
import { Button, Input, Label } from '@pe/ui';
import { updateMyProfile, type ActionResult } from './actions';

interface Props {
  initialFullName: string;
}

export function ProfileForm({ initialFullName }: Props) {
  const [pending, startTransition] = useTransition();
  const [fullName, setFullName] = useState(initialFullName);
  const [result, setResult] = useState<ActionResult | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateMyProfile(fd);
      setResult(res);
    });
  }

  const dirty = fullName.trim() !== initialFullName.trim();

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <Label htmlFor="fullName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Full name
        </Label>
        <Input
          id="fullName"
          name="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="mt-1"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || !dirty}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
        {result ? (
          <span
            className={result.ok ? 'text-sm text-green-600' : 'text-sm text-red-600'}
            role={result.ok ? 'status' : 'alert'}
          >
            {result.ok ? result.message : result.error}
          </span>
        ) : null}
      </div>
    </form>
  );
}
