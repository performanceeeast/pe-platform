import { startOfDay, endOfDay, isBefore } from 'date-fns';

export function greetingFor(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function todayRange(now: Date = new Date()) {
  return {
    start: startOfDay(now).toISOString(),
    end: endOfDay(now).toISOString(),
  };
}

export function isOverdue(dueIso: string | null, now: Date = new Date()): boolean {
  if (!dueIso) return false;
  return isBefore(new Date(dueIso), startOfDay(now));
}

export function formatDayHeading(date: Date = new Date()): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}
