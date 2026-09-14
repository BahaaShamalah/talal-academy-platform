'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { formatTimeRange12h } from '@/lib/time';

export type ScheduleView = 'day' | 'week' | 'month';

export type ScheduleSession = {
  id: number;
  session_date: string;
  day_name: string;
  start_time: string | null;
  end_time: string | null;
  subject_name?: string | null;
  teacher_name?: string | null;
  hall_name?: string | null;
  status: string;
  class_offering_id?: number;
};

export type WaitingSubject = {
  grade_id?: number;
  grade_name?: string | null;
  subject_id: number;
  subject_name: string;
  plan_id?: number;
  plan_name?: string | null;
  period_id?: number | null;
};

type SchedulePayload = {
  sessions: ScheduleSession[];
  waiting_subjects: WaitingSubject[];
  meta: { view: ScheduleView; range_start: string; range_end: string; payment_pending?: boolean };
};

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

/** JS getDay: 0=Sun … 6=Sat → Kuwait index 0=Sat … 6=Fri */
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

function formatRangeLabel(view: ScheduleView, meta: SchedulePayload['meta'] | null, date: string) {
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

function SessionCard({ session }: { session: ScheduleSession }) {
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
        {session.teacher_name ? <div>{session.teacher_name}</div> : null}
        {session.hall_name ? <div>{session.hall_name}</div> : null}
      </div>
    </div>
  );
}

export default function StudentSchedule({ studentId }: { studentId: string }) {
  const [view, setView] = useState<ScheduleView>('week');
  const [date, setDate] = useState(todayIso);
  const [data, setData] = useState<SchedulePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dayModal, setDayModal] = useState<{ date: string; sessions: ScheduleSession[] } | null>(
    null,
  );

  const load = useCallback(async (v: ScheduleView, d: string) => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ view: v, date: d });
      const res = await fetch(`/api/guardian/students/${studentId}/schedule?${qs}`, {
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || 'تعذّر تحميل الجدول');
        setData(null);
        return;
      }
      setData(json as SchedulePayload);
    } catch {
      setError('حدث خطأ في الاتصال');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void load(view, date);
  }, [load, view, date]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') {
        void load(view, date);
      }
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load, view, date]);

  function changeView(next: ScheduleView) {
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
    const map = new Map<string, ScheduleSession[]>();
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

  const waiting = data?.waiting_subjects ?? [];
  const paymentPending = data?.meta.payment_pending === true;

  function openDay(iso: string) {
    const list = sessionsByDate.get(iso) ?? [];
    setDayModal({ date: iso, sessions: list });
  }

  function switchToDay(iso: string) {
    setDayModal(null);
    setView('day');
    setDate(iso);
  }

  return (
    <section className="rounded-2xl border border-[#ece6d8] bg-white p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[15px] font-extrabold">الجدول الدراسي</h3>
        <div className="flex rounded-full bg-[#f4f0e6] p-1">
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
                'rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition-colors',
                view === id ? 'bg-navy-800 text-gold' : 'text-[#8a8478]',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={goPrev}
            disabled={loading}
            className="rounded-full border border-[#e5dfd0] bg-white px-3 py-1.5 text-[12.5px] font-bold text-navy-800 disabled:opacity-50"
          >
            السابق
          </button>
          <button
            type="button"
            onClick={goToday}
            disabled={loading}
            className="rounded-full border border-[#e5dfd0] bg-[#f8f5ee] px-3 py-1.5 text-[12.5px] font-bold text-navy-800 disabled:opacity-50"
          >
            اليوم
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={loading}
            className="rounded-full border border-[#e5dfd0] bg-white px-3 py-1.5 text-[12.5px] font-bold text-navy-800 disabled:opacity-50"
          >
            التالي
          </button>
        </div>
        <p className="text-[12.5px] font-semibold text-[#8a8478]">
          {formatRangeLabel(view, data?.meta ?? null, date)}
        </p>
      </div>

      {paymentPending ? (
        <div className="mb-4 rounded-xl border border-[#c5d4ea] bg-[#eaf0f8] px-3.5 py-2.5">
          <p className="text-[12.5px] font-semibold text-[#1c4b8f]">
            تذكير: الدفع لسا معلّق، أكمله أونلاين أو بزيارة المعهد
          </p>
        </div>
      ) : null}

      {waiting.length > 0 ? (
        <div className="mb-4 rounded-xl border border-[#ead9b0] bg-[#f7f0e1] px-3.5 py-3">
          <p className="text-[13px] font-extrabold text-[#8a6a20]">مواد بانتظار حل تعارض الجدول</p>
          <p className="mt-0.5 text-[12px] text-[#8a6a20]/90">
            يوجد تعارض بمواعيدك الحالية
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {waiting.map((w) => (
              <li
                key={`${w.subject_id}-${w.plan_id ?? ''}`}
                className="rounded-full border border-[#e2d0a0] bg-white/70 px-2.5 py-1 text-[12px] font-bold text-[#8a6a20]"
              >
                {w.subject_name}
                {w.grade_name ? (
                  <span className="font-normal opacity-80"> · {w.grade_name}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl bg-[#f8f5ee] px-4 py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy-800/20 border-t-navy-800" />
          <p className="text-[13px] text-[#8a8478]">جاري تحميل الجدول…</p>
          <p className="text-[11.5px] text-[#aba59a]">قد يستغرق لحظات لتوليد الجلسات</p>
        </div>
      ) : null}

      {!loading && error ? (
        <p className="rounded-xl bg-[#f8ecec] px-4 py-3 text-[13px] text-[#a34b4b]">{error}</p>
      ) : null}

      {!loading && !error && view === 'week' ? (
        <div className="overflow-x-auto">
          <div className="hidden min-w-[720px] grid-cols-7 gap-2 sm:grid">
            {weekColumns.map((col) => (
              <div key={col.iso} className="min-h-[120px]">
                <div className="mb-2 text-center">
                  <div className="text-[11.5px] font-extrabold text-navy-800">{col.label}</div>
                  <div className="font-latin text-[11px] text-[#8a8478]">{col.iso.slice(8)}</div>
                </div>
                <div className="space-y-1.5">
                  {col.sessions.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#e5dfd0] px-2 py-4 text-center text-[11px] text-[#aba59a]">
                      —
                    </div>
                  ) : (
                    col.sessions.map((s) => <SessionCard key={s.id} session={s} />)
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-3 sm:hidden">
            {weekColumns.map((col) => (
              <div key={col.iso} className="rounded-xl border border-[#ece6d8] bg-[#faf8f3] p-3">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <div className="text-[13px] font-extrabold text-navy-800">{col.label}</div>
                  <div className="font-latin text-[11.5px] text-[#8a8478]">{col.iso}</div>
                </div>
                {col.sessions.length === 0 ? (
                  <p className="text-[12px] text-[#aba59a]">لا توجد حصص</p>
                ) : (
                  <div className="space-y-1.5">
                    {col.sessions.map((s) => (
                      <SessionCard key={s.id} session={s} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!loading && !error && view === 'day' ? (
        <div className="space-y-2">
          {(sessionsByDate.get(data?.meta.range_start ?? date) ?? []).length === 0 ? (
            <p className="rounded-xl bg-[#f8f5ee] px-4 py-6 text-center text-[13px] text-[#8a8478]">
              لا توجد حصص في هذا اليوم.
            </p>
          ) : (
            (sessionsByDate.get(data?.meta.range_start ?? date) ?? []).map((s) => (
              <SessionCard key={s.id} session={s} />
            ))
          )}
        </div>
      ) : null}

      {!loading && !error && view === 'month' ? (
        <div>
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-extrabold text-[#8a8478]">
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
                    ? 'border-[#ece6d8] bg-[#faf8f3] hover:border-gold/50 hover:bg-white'
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
                      <span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-navy-800"
                      />
                    ))}
                    {cell.count > 4 ? (
                      <span className="text-[9px] font-bold text-[#8a8478]">+{cell.count - 4}</span>
                    ) : null}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          {(data?.sessions.length ?? 0) === 0 ? (
            <p className="mt-3 text-center text-[12.5px] text-[#8a8478]">
              لا توجد حصص مسجّلة في هذا الشهر.
            </p>
          ) : null}
        </div>
      ) : null}

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
                className="rounded-full border border-[#e5dfd0] px-2.5 py-1 text-[12px] text-[#8a8478]"
              >
                إغلاق
              </button>
            </div>
            {dayModal.sessions.length === 0 ? (
              <p className="text-[13px] text-[#8a8478]">لا توجد حصص في هذا اليوم.</p>
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
