'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import {
  apiClient,
  qs,
  type InstituteSetting,
  type TeachingSchedulePayload,
  type TeachingScheduleSession,
  type TeachingScheduleView,
} from '@/lib/api-client';
import {
  openTeachingScheduleExport,
  printTeachingSchedule,
} from '@/lib/teaching-schedule-print';
import { openPrintPreviewWindow } from '@/lib/print/print-utils';
import { formatTimeRange12h } from '@/lib/time';
import { useAuthStore } from '@/stores/auth-store';

const WEEK_DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'] as const;

const SUBJECT_PALETTE = [
  { bg: '#eaf0f8', fg: '#1c4b8f', border: '#c5d4ea' },
  { bg: '#e9f3ec', fg: '#2e7d4f', border: '#b9dcc5' },
  { bg: '#f7f0e1', fg: '#8a6a20', border: '#e2d0a0' },
  { bg: '#f0eef4', fg: '#5c4a7a', border: '#d4cde0' },
  { bg: '#f8ecec', fg: '#a34b4b', border: '#e8c4c4' },
  { bg: '#e8f4f4', fg: '#2a6b6b', border: '#b8d8d8' },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseIso(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(iso: string, days: number) {
  const d = parseIso(iso);
  d.setDate(d.getDate() + days);
  return toIso(d);
}

function addMonths(iso: string, months: number) {
  const d = parseIso(iso);
  d.setMonth(d.getMonth() + months);
  return toIso(d);
}

function kuwaitDayIndex(iso: string) {
  const js = parseIso(iso).getDay();
  return (js + 1) % 7;
}

function saturdayOfWeek(iso: string) {
  return addDays(iso, -kuwaitDayIndex(iso));
}

function colorForSubject(name?: string | null) {
  const key = (name ?? '').trim() || 'x';
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return SUBJECT_PALETTE[hash % SUBJECT_PALETTE.length];
}

function formatRangeLabel(view: TeachingScheduleView, meta: TeachingSchedulePayload['meta'] | null, date: string) {
  if (!meta) return date;
  if (view === 'day') {
    return parseIso(meta.range_start).toLocaleDateString('ar-KW', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  if (view === 'month') {
    return parseIso(meta.range_start).toLocaleDateString('ar-KW', {
      month: 'long',
      year: 'numeric',
    });
  }
  return `${meta.range_start} → ${meta.range_end}`;
}

function SessionCard({ session }: { session: TeachingScheduleSession }) {
  const cancelled = session.status === 'cancelled';
  const colors = colorForSubject(session.subject_name);

  return (
    <div
      className={cn(
        'rounded-xl border px-2.5 py-2 text-right transition-opacity',
        cancelled && 'opacity-55 line-through decoration-[#a34b4b]/70',
      )}
      style={{
        background: cancelled ? '#f4f1ea' : colors.bg,
        borderColor: cancelled ? '#e2ddd2' : colors.border,
        color: cancelled ? '#8a8478' : colors.fg,
      }}
    >
      <div className="text-[12.5px] font-extrabold leading-snug">
        {session.subject_name ?? 'حصة'}
        {cancelled ? (
          <span className="ms-1 text-[10.5px] font-bold no-underline">(ملغاة)</span>
        ) : null}
      </div>
      <div className="font-latin mt-0.5 text-[11.5px] font-bold opacity-90" dir="ltr">
        {formatTimeRange12h(session.start_time, session.end_time)}
      </div>
      <div className="mt-1 space-y-0.5 text-[11px] opacity-85">
        {session.hall_name ? <div>{session.hall_name}</div> : null}
      </div>
    </div>
  );
}

export function TeachingScheduleCalendar() {
  const teacherName = useAuthStore((s) => s.user?.name ?? null);
  const [view, setView] = useState<TeachingScheduleView>('week');
  const [date, setDate] = useState(todayIso);
  const [dayModal, setDayModal] = useState<{ date: string; sessions: TeachingScheduleSession[] } | null>(
    null,
  );

  const scheduleQuery = useQuery({
    queryKey: ['me-teaching-schedule', view, date],
    queryFn: () =>
      apiClient<TeachingSchedulePayload>(`/me/teaching-schedule${qs({ view, date })}`),
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  });

  const instituteQuery = useQuery({
    queryKey: ['institute-settings'],
    queryFn: () => apiClient<InstituteSetting>('/settings/institute'),
    staleTime: 60_000,
  });

  const data = scheduleQuery.data ?? null;
  const loading = scheduleQuery.isLoading || scheduleQuery.isFetching;
  const error =
    scheduleQuery.error instanceof Error
      ? scheduleQuery.error.message
      : scheduleQuery.isError
        ? 'تعذّر تحميل الجدول'
        : '';

  function changeView(next: TeachingScheduleView) {
    if (next === view) return;
    setView(next);
    setDayModal(null);
  }

  function goToday() {
    setDate(todayIso());
    setDayModal(null);
  }

  function goPrev() {
    const anchor = data?.meta.range_start ?? date;
    if (view === 'day') setDate(addDays(anchor, -1));
    else if (view === 'week') setDate(addDays(anchor, -7));
    else setDate(addMonths(anchor, -1));
    setDayModal(null);
  }

  function goNext() {
    const anchor = data?.meta.range_start ?? date;
    if (view === 'day') setDate(addDays(anchor, 1));
    else if (view === 'week') setDate(addDays(anchor, 7));
    else setDate(addMonths(anchor, 1));
    setDayModal(null);
  }

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, TeachingScheduleSession[]>();
    for (const s of data?.sessions ?? []) {
      const list = map.get(s.session_date) ?? [];
      list.push(s);
      map.set(s.session_date, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''));
    }
    return map;
  }, [data?.sessions]);

  const weekColumns = useMemo(() => {
    const start = data?.meta.range_start ?? saturdayOfWeek(date);
    return WEEK_DAYS.map((label, i) => {
      const iso = addDays(start, i);
      return { label, iso, sessions: sessionsByDate.get(iso) ?? [] };
    });
  }, [data?.meta.range_start, date, sessionsByDate]);

  const monthCells = useMemo(() => {
    if (!data?.meta || view !== 'month') return [];
    const monthStart = data.meta.range_start;
    const monthEnd = data.meta.range_end;
    const gridStart = saturdayOfWeek(monthStart);
    const gridEndFriday = addDays(saturdayOfWeek(monthEnd), 6);
    const cells: { iso: string; inMonth: boolean; count: number }[] = [];
    let cursor = gridStart;
    while (cursor <= gridEndFriday) {
      cells.push({
        iso: cursor,
        inMonth: cursor >= monthStart && cursor <= monthEnd,
        count: (sessionsByDate.get(cursor) ?? []).length,
      });
      cursor = addDays(cursor, 1);
    }
    return cells;
  }, [data?.meta, view, sessionsByDate]);

  function openDay(iso: string) {
    setDayModal({ date: iso, sessions: sessionsByDate.get(iso) ?? [] });
  }

  function switchToDay(iso: string) {
    setDayModal(null);
    setView('day');
    setDate(iso);
  }

  async function handlePrint() {
    if (!data) {
      toast.error('لا بيانات للطباعة');
      return;
    }
    let preview: Window | null = null;
    try {
      preview = openPrintPreviewWindow();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذّرت الطباعة');
      return;
    }
    try {
      await printTeachingSchedule({
        payload: data,
        institute: instituteQuery.data,
        teacherName,
        targetWindow: preview,
      });
    } catch (err) {
      try {
        preview.close();
      } catch {
        /* ignore */
      }
      toast.error(err instanceof Error ? err.message : 'تعذّرت الطباعة');
    }
  }

  function handleExportPdf() {
    openTeachingScheduleExport({ view, date }, 'download');
  }

  const showInitialSpinner = scheduleQuery.isLoading && !data;

  return (
    <section className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0ece1] px-4 py-3.5 sm:px-5">
        <div>
          <h3 className="text-[15px] font-extrabold text-navy-800">جدولي</h3>
          <p className="mt-0.5 text-[12px] font-semibold text-ink-dim">
            {formatRangeLabel(view, data?.meta ?? null, date)}
            {loading && data ? (
              <span className="ms-2 text-[11px] text-gold">تحديث…</span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-cream-soft p-1">
            {(
              [
                ['day', 'يوم'],
                ['week', 'أسبوع'],
                ['month', 'شهر'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => changeView(id)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors',
                  view === id ? 'bg-navy-800 text-gold' : 'text-ink-dim hover:text-navy-800',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={goPrev}
              disabled={loading}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-cream-line2 bg-white text-navy-800 disabled:opacity-50"
              title="السابق"
            >
              <Icon name="fa-solid fa-chevron-right" className="text-[11px]" />
            </button>
            <button
              type="button"
              onClick={goToday}
              disabled={loading}
              className="rounded-full border border-cream-line2 bg-cream-soft px-3 py-1.5 text-[12px] font-bold text-navy-800 disabled:opacity-50"
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={loading}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-cream-line2 bg-white text-navy-800 disabled:opacity-50"
              title="التالي"
            >
              <Icon name="fa-solid fa-chevron-left" className="text-[11px]" />
            </button>
          </div>
          <div className="flex items-center gap-1 border-s border-cream-line ps-2">
            <button
              type="button"
              onClick={() => void handlePrint()}
              disabled={!data || loading}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-cream-line2 bg-white text-navy-800 disabled:opacity-50"
              title="طباعة"
            >
              <Icon name="fa-solid fa-print" className="text-[12px] text-gold-deep" />
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={!data || loading}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-cream-line2 bg-white text-navy-800 disabled:opacity-50"
              title="تصدير PDF"
            >
              <Icon name="fa-solid fa-file-pdf" className="text-[12px] text-gold-deep" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
      {showInitialSpinner ? (
        <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl bg-cream-soft px-4 py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy-800/20 border-t-navy-800" />
          <p className="text-[13px] text-ink-dim">جاري تحميل الجدول…</p>
        </div>
      ) : null}

      {!showInitialSpinner && error ? (
        <p className="rounded-xl bg-[#f8ecec] px-4 py-3 text-[13px] text-[#a34b4b]">{error}</p>
      ) : null}

      {!showInitialSpinner && !error && view === 'week' ? (
        <div className="overflow-x-auto">
          <div className="grid min-w-[720px] grid-cols-7 gap-2">
            {weekColumns.map((col) => (
              <div key={col.iso} className="min-h-[120px]">
                <div className="mb-2 text-center">
                  <div className="text-[11.5px] font-extrabold text-navy-800">{col.label}</div>
                  <div className="font-latin text-[11px] text-ink-dim">{col.iso.slice(8)}</div>
                </div>
                <div className="space-y-1.5">
                  {col.sessions.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-cream-line2 px-2 py-4 text-center text-[11px] text-ink-dim">
                      —
                    </div>
                  ) : (
                    col.sessions.map((s) => <SessionCard key={s.id} session={s} />)
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!showInitialSpinner && !error && view === 'day' ? (
        <div className="space-y-2">
          {(sessionsByDate.get(data?.meta.range_start ?? date) ?? []).length === 0 ? (
            <p className="rounded-xl bg-cream-soft px-4 py-6 text-center text-[13px] text-ink-dim">
              لا توجد حصص في هذا اليوم.
            </p>
          ) : (
            (sessionsByDate.get(data?.meta.range_start ?? date) ?? []).map((s) => (
              <SessionCard key={s.id} session={s} />
            ))
          )}
        </div>
      ) : null}

      {!showInitialSpinner && !error && view === 'month' ? (
        <div>
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-extrabold text-ink-dim">
            {WEEK_DAYS.map((d) => (
              <div key={d}>{d.slice(0, 3)}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((cell) => (
              <button
                key={cell.iso}
                type="button"
                disabled={!cell.inMonth}
                onClick={() => cell.inMonth && openDay(cell.iso)}
                className={cn(
                  'flex min-h-[58px] flex-col items-center rounded-xl border px-1 py-1.5 text-center transition-colors',
                  cell.inMonth
                    ? 'border-cream-line bg-[#faf8f3] hover:border-gold/50 hover:bg-white'
                    : 'border-transparent bg-transparent opacity-30',
                  cell.iso === todayIso() && cell.inMonth && 'ring-2 ring-gold/50',
                )}
              >
                <span className="font-latin text-[12.5px] font-bold text-navy-800">
                  {cell.iso.slice(8)}
                </span>
                {cell.count > 0 ? (
                  <span className="mt-1 flex flex-wrap justify-center gap-0.5">
                    {Array.from({ length: Math.min(cell.count, 4) }).map((_, i) => (
                      <span key={i} className="h-1.5 w-1.5 rounded-full bg-navy-800" />
                    ))}
                    {cell.count > 4 ? (
                      <span className="text-[9px] font-bold text-ink-dim">+{cell.count - 4}</span>
                    ) : null}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      </div>

      {dayModal ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setDayModal(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-bold text-gold">تفاصيل اليوم</p>
                <h4 className="text-[15px] font-extrabold text-navy-800">
                  {parseIso(dayModal.date).toLocaleDateString('ar-KW', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setDayModal(null)}
                className="rounded-full border border-cream-line2 px-2.5 py-1 text-[12px] text-ink-dim"
              >
                إغلاق
              </button>
            </div>
            {dayModal.sessions.length === 0 ? (
              <p className="text-[13px] text-ink-dim">لا توجد حصص في هذا اليوم.</p>
            ) : (
              <div className="max-h-[50vh] space-y-2 overflow-y-auto">
                {dayModal.sessions.map((s) => (
                  <SessionCard key={s.id} session={s} />
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => switchToDay(dayModal.date)}
              className="mt-4 w-full rounded-full bg-navy-800 py-2.5 text-[13px] font-extrabold text-gold"
            >
              عرض كيوم كامل
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
