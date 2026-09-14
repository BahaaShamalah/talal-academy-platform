import { formatTimeRange12h } from '@/lib/time';

/** Carbon dayOfWeek: 0=Sunday … 6=Saturday */
export const WEEKDAYS = [
  { id: 0, label: 'الأحد' },
  { id: 1, label: 'الإثنين' },
  { id: 2, label: 'الثلاثاء' },
  { id: 3, label: 'الأربعاء' },
  { id: 4, label: 'الخميس' },
  { id: 5, label: 'الجمعة' },
  { id: 6, label: 'السبت' },
] as const;

export function weekdayLabel(day: number | null | undefined): string {
  if (day === null || day === undefined) return '—';
  return WEEKDAYS.find((d) => d.id === day)?.label ?? '—';
}

export function formatScheduleSlot(day: number, start: string, end: string): string {
  return `${weekdayLabel(day)} ${formatTimeRange12h(start, end)}`;
}
