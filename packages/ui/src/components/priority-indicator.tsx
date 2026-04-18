import { cn } from '../lib/utils';

/**
 * Priority scale: 0=P0 critical, 1=P1 high, 2=P2 normal, 3=P3 low.
 * Visual treatment: colored left-border accent plus a P0/P1/P2/P3 label.
 */

export type Priority = 0 | 1 | 2 | 3;

const PRIORITY_LABELS: Record<Priority, string> = {
  0: 'P0',
  1: 'P1',
  2: 'P2',
  3: 'P3',
};

// Warm → cool as urgency drops. P0 uses the brand red (matches --primary
// and the logo). P2 moves to slate so the badge palette stays
// scannable — every open task would otherwise be red.
const PRIORITY_CLASSES: Record<Priority, string> = {
  0: 'bg-pe-red-600 text-white',
  1: 'bg-orange-500 text-white',
  2: 'bg-slate-600 text-white',
  3: 'bg-muted text-muted-foreground',
};

export interface PriorityIndicatorProps {
  priority: Priority;
  className?: string;
}

export function PriorityIndicator({ priority, className }: PriorityIndicatorProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 min-w-[2rem] items-center justify-center rounded-full px-2 text-xs font-bold tabular-nums',
        PRIORITY_CLASSES[priority],
        className,
      )}
      aria-label={`Priority ${PRIORITY_LABELS[priority]}`}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

/** Returns the 0–3 priority coerced from a raw DB int. Falls back to P2. */
export function toPriority(value: number): Priority {
  if (value === 0 || value === 1 || value === 2 || value === 3) return value;
  return 2;
}
