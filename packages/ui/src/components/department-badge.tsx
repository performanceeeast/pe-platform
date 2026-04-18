import { Badge } from './badge';
import { cn } from '../lib/utils';

/** PE departments — must stay in sync with the `department` enum in Supabase. */
export const DEPARTMENTS = [
  'sales',
  'service',
  'parts',
  'fni',
  'h2_grow',
  'personal',
  'other',
] as const;

export type Department = (typeof DEPARTMENTS)[number];

const DEPARTMENT_LABELS: Record<Department, string> = {
  sales: 'Sales',
  service: 'Service',
  parts: 'Parts',
  fni: 'F&I',
  h2_grow: 'H2Grow',
  personal: 'Personal',
  other: 'Other',
};

// Sales uses the legacy PE Navy so the brand red stays reserved for
// app-wide primary + P0 critical. Chrome + navy + red together echo the
// logo itself.
const DEPARTMENT_CLASSES: Record<Department, string> = {
  sales: 'bg-pe-navy text-white hover:brightness-110',
  service: 'bg-amber-600 text-white hover:bg-amber-700',
  parts: 'bg-emerald-600 text-white hover:bg-emerald-700',
  fni: 'bg-violet-600 text-white hover:bg-violet-700',
  h2_grow: 'bg-cyan-600 text-white hover:bg-cyan-700',
  personal: 'bg-slate-500 text-white hover:bg-slate-600',
  other: 'bg-muted text-muted-foreground hover:bg-muted/80',
};

export interface DepartmentBadgeProps {
  department: Department;
  className?: string;
}

export function DepartmentBadge({ department, className }: DepartmentBadgeProps) {
  return (
    <Badge className={cn('border-transparent', DEPARTMENT_CLASSES[department], className)}>
      {DEPARTMENT_LABELS[department]}
    </Badge>
  );
}
