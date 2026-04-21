'use client';

import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pe/ui';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface MonthYearPickerProps {
  storeSlug: string;
  year: number;
  month: number;
  /** How many years backward from the current year to offer. */
  yearsBack?: number;
  /** How many years forward from the current year to offer. */
  yearsForward?: number;
}

export function MonthYearPicker({
  storeSlug,
  year,
  month,
  yearsBack = 2,
  yearsForward = 2,
}: MonthYearPickerProps) {
  const router = useRouter();
  const nowYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = nowYear - yearsBack; y <= nowYear + yearsForward; y++) {
    years.push(y);
  }
  if (!years.includes(year)) years.unshift(year);
  years.sort((a, b) => a - b);

  function go(nextYear: number, nextMonth: number) {
    router.push(
      `/${storeSlug}/sales/setup/goals?year=${nextYear}&month=${nextMonth}`,
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={String(month)} onValueChange={(v) => go(year, Number(v))}>
        <SelectTrigger className="h-9 w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((label, idx) => (
            <SelectItem key={idx + 1} value={String(idx + 1)}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={String(year)} onValueChange={(v) => go(Number(v), month)}>
        <SelectTrigger className="h-9 w-[100px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
