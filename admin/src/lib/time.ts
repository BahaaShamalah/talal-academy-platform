export function formatTime12h(time: string | null | undefined): string {
  if (!time) return '—';

  const normalized = time.slice(0, 5);
  const match = /^(\d{1,2}):(\d{2})$/.exec(normalized);
  if (!match) return time;

  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const period = hour >= 12 ? 'م' : 'ص';
  hour = hour % 12;
  if (hour === 0) hour = 12;

  return `${hour}:${minute} ${period}`;
}

export function formatTimeRange12h(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  return `${formatTime12h(start)} – ${formatTime12h(end)}`;
}
