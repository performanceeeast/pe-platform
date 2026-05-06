'use client';

import { useState, useTransition } from 'react';
import { cn } from '@pe/ui';
import { setSalespersonGrant } from './actions';

interface Props {
  userId: string;
  initial: boolean;
  /**
   * When true, the user's primary role is already a salesperson role, so the
   * grant is implied — show as locked-on rather than toggleable.
   */
  implied: boolean;
}

export function SalespersonToggle({ userId, initial, implied }: Props) {
  const [on, setOn] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (implied) {
    return (
      <span
        className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
        title="Primary role is already a salesperson role"
      >
        Yes (role)
      </span>
    );
  }

  function flip() {
    const next = !on;
    setOn(next);
    setError(null);
    const fd = new FormData();
    fd.set('userId', userId);
    fd.set('on', next ? 'true' : 'false');
    startTransition(async () => {
      const res = await setSalespersonGrant(fd);
      if (!res.ok) {
        setOn(!next);
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={pending}
        onClick={flip}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors',
          on ? 'bg-pe-red-500' : 'bg-muted',
          pending ? 'opacity-60' : '',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
            on ? 'translate-x-[18px]' : 'translate-x-0.5',
          )}
        />
      </button>
      {error ? (
        <span className="text-xs text-destructive" title={error}>
          !
        </span>
      ) : null}
    </div>
  );
}
