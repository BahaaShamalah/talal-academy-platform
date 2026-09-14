'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import {
  apiClient,
  type AttendanceStatus,
  type SessionRosterResponse,
} from '@/lib/api-client';
import { isTeacherOnly } from '@/lib/dashboard-routes';
import { formatTimeRange12h } from '@/lib/time';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

const STATUS_OPTIONS: {
  id: AttendanceStatus;
  label: string;
  short: string;
  active: string;
  idle: string;
  ring: string;
}[] = [
  {
    id: 'present',
    label: 'حاضر',
    short: 'ح',
    active: 'bg-[#2e7d4f] text-white border-[#2e7d4f]',
    idle: 'bg-white text-[#2e7d4f] border-[#cfe3d5] hover:bg-[#e9f3ec]',
    ring: 'border-[#2e7d4f] bg-[#e9f3ec]/50',
  },
  {
    id: 'absent',
    label: 'غائب',
    short: 'غ',
    active: 'bg-[#a34b4b] text-white border-[#a34b4b]',
    idle: 'bg-white text-[#a34b4b] border-[#efd4d4] hover:bg-[#f8ecec]',
    ring: 'border-[#a34b4b] bg-[#f8ecec]/50',
  },
  {
    id: 'late',
    label: 'متأخر',
    short: 'ت',
    active: 'bg-[#c47a1a] text-white border-[#c47a1a]',
    idle: 'bg-white text-[#c47a1a] border-[#ead9b0] hover:bg-[#f7f0e1]',
    ring: 'border-[#c47a1a] bg-[#f7f0e1]/50',
  },
  {
    id: 'excused',
    label: 'مستأذن',
    short: 'م',
    active: 'bg-[#6b7280] text-white border-[#6b7280]',
    idle: 'bg-white text-[#6b7280] border-[#e2ddd2] hover:bg-[#f4f1ea]',
    ring: 'border-[#6b7280] bg-[#f4f1ea]/50',
  },
];

export function SessionAttendancePage({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const teacherOnly = isTeacherOnly(useAuthStore((s) => s.user));
  const [marks, setMarks] = useState<Record<number, AttendanceStatus>>({});
  const [hydrated, setHydrated] = useState(false);

  const rosterQuery = useQuery({
    queryKey: ['session-roster', sessionId],
    queryFn: () => apiClient<SessionRosterResponse>(`/sessions/${sessionId}/roster`),
  });

  useEffect(() => {
    if (!rosterQuery.data || hydrated) return;
    const initial: Record<number, AttendanceStatus> = {};
    for (const row of rosterQuery.data.roster) {
      if (row.attendance?.status) {
        initial[row.student.id] = row.attendance.status;
      }
    }
    setMarks(initial);
    setHydrated(true);
  }, [rosterQuery.data, hydrated]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const records = Object.entries(marks).map(([studentId, status]) => ({
        student_id: Number(studentId),
        status,
      }));
      return apiClient(`/sessions/${sessionId}/attendance`, {
        method: 'POST',
        body: JSON.stringify({ records }),
      });
    },
    onSuccess: () => {
      toast.success('تم حفظ الحضور');
      qc.invalidateQueries({ queryKey: ['session-roster', sessionId] });
      qc.invalidateQueries({ queryKey: ['attendance-hub-sessions'] });
      const offeringId = rosterQuery.data?.session.class_offering_id;
      if (offeringId) {
        qc.invalidateQueries({ queryKey: ['class-offering-sessions', String(offeringId)] });
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const roster = rosterQuery.data?.roster ?? [];
  const session = rosterQuery.data?.session;

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 };
    for (const row of roster) {
      const status = marks[row.student.id];
      if (!status) c.unmarked += 1;
      else c[status] += 1;
    }
    return c;
  }, [marks, roster]);

  const markedCount = roster.length - counts.unmarked;
  const allMarked = roster.length > 0 && counts.unmarked === 0;

  function setAllPresent() {
    const next: Record<number, AttendanceStatus> = {};
    for (const row of roster) next[row.student.id] = 'present';
    setMarks(next);
  }

  function setStatus(studentId: number, status: AttendanceStatus) {
    setMarks((prev) => ({ ...prev, [studentId]: status }));
  }

  if (rosterQuery.isLoading) {
    return (
      <>
        <AdminHeader title="أخذ الحضور" crumb="جاري التحميل…" />
        <AdminContent className="text-[13px] text-ink-dim">جاري تحميل الروستر…</AdminContent>
      </>
    );
  }

  if (rosterQuery.isError || !session) {
    return (
      <>
        <AdminHeader title="أخذ الحضور" crumb="غير موجودة" />
        <AdminContent>
          <EmptyState
            icon="fa-solid fa-calendar-xmark"
            title="الجلسة غير موجودة"
            body="تعذر تحميل بيانات هذه الجلسة."
            primary={{ label: 'العودة', onClick: () => router.push('/dashboard/attendance') }}
          />
        </AdminContent>
      </>
    );
  }

  const groupLabel = session.class_offering?.label || 'عرض مادة';
  const groupName = session.class_offering?.label || groupLabel;

  return (
    <>
      <AdminHeader title="أخذ الحضور" crumb={`الحضور ← ${groupLabel}`} />

      <AdminContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/attendance"
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink-soft hover:text-navy"
          >
            <Icon name="fa-solid fa-arrow-right" className="text-[11px]" />
            قائمة الحضور
          </Link>
          <span className="text-ink-faint">·</span>
          <Link
            href={`/dashboard/class-offerings/${session.class_offering_id}/sessions`}
            className="text-[13px] font-semibold text-ink-soft hover:text-navy"
          >
            جلسات العرض
          </Link>
        </div>

        <section className="sticky top-0 z-10 overflow-hidden rounded-[18px] border border-cream-line bg-white/95 p-4 shadow-sm backdrop-blur sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11.5px] font-bold tracking-wide text-gold">SESSION</div>
              <h1 className="mt-1 font-display text-[20px] font-bold text-navy-800 sm:text-[22px]">
                {groupName}
              </h1>
              <p className="mt-1 text-[13px] text-ink-soft">{groupLabel}</p>
              <p className="font-latin mt-2 text-[14px] font-bold text-navy">
                {session.session_date}
                <span className="mx-2 text-ink-faint">|</span>
                {formatTimeRange12h(session.start_time, session.end_time)}
              </p>
            </div>
            <button
              type="button"
              onClick={setAllPresent}
              disabled={roster.length === 0}
              className="shrink-0 rounded-full border border-[#cfe3d5] bg-[#e9f3ec] px-4 py-2.5 text-[13px] font-extrabold text-[#2e7d4f] disabled:opacity-50"
            >
              تحديد الكل: حاضر
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <CountChip label="حاضر" value={counts.present} color="#2e7d4f" bg="#e9f3ec" />
            <CountChip label="غائب" value={counts.absent} color="#a34b4b" bg="#f8ecec" />
            <CountChip label="متأخر" value={counts.late} color="#c47a1a" bg="#f7f0e1" />
            <CountChip label="مستأذن" value={counts.excused} color="#6b7280" bg="#f4f1ea" />
            <CountChip label="غير محدد" value={counts.unmarked} color="#8a8478" bg="#f4f1ea" />
          </div>
        </section>

        {roster.length === 0 ? (
          <EmptyState
            icon="fa-solid fa-user-slash"
            title="لا يوجد طلاب نشطون"
            body="لا يوجد تسجيلات نشطة في هذه الشعبة لأخذ الحضور."
          />
        ) : (
          <div className="space-y-2 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:pb-28">
            {roster.map((row, index) => {
              const selected = marks[row.student.id];
              const meta = STATUS_OPTIONS.find((o) => o.id === selected);
              const initial = row.student.full_name.trim().charAt(0) || '؟';

              return (
                <div
                  key={row.student.id}
                  className={`rounded-[16px] border-2 bg-white p-3 transition-colors sm:p-3.5 ${
                    meta ? meta.ring : 'border-cream-line'
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy text-[16px] font-bold text-gold-soft">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-latin text-[11px] font-bold text-ink-faint">
                            {index + 1}
                          </span>
                          <div className="truncate text-[15px] font-bold text-ink">
                            {row.student.full_name}
                          </div>
                        </div>
                        <div className="font-latin mt-0.5 text-[12px] text-ink-dim">
                          {row.student.file_number}
                        </div>
                      </div>
                    </div>

                    <div className="grid w-full grid-cols-4 gap-1.5 sm:w-auto sm:min-w-[340px]">
                      {STATUS_OPTIONS.map((opt) => {
                        const isActive = selected === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setStatus(row.student.id, opt.id)}
                            className={`min-h-[46px] rounded-xl border-2 text-[13px] font-extrabold transition-all active:scale-[0.98] sm:min-h-[48px] sm:text-[14px] ${
                              isActive ? `${opt.active} scale-[1.02] shadow-sm` : opt.idle
                            }`}
                          >
                            <span className="sm:hidden">{opt.short}</span>
                            <span className="hidden sm:inline">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AdminContent>

      {roster.length > 0 ? (
        <div
          className={cn(
            'fixed inset-x-0 z-40 border-t border-cream-line bg-white/95 px-3.5 py-3 backdrop-blur lg:right-[246px]',
            teacherOnly
              ? 'bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:bottom-0'
              : 'bottom-0',
          )}
          style={
            teacherOnly
              ? undefined
              : { paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }
          }
        >
          <div className="flex items-center gap-3">
            <div className="hidden min-w-0 flex-1 text-[12.5px] text-ink-dim sm:block">
              {allMarked
                ? 'كل الطلاب محددون — جاهز للحفظ'
                : `${markedCount} من ${roster.length} محدد — سيُحفظ المحدد فقط`}
            </div>
            <button
              type="button"
              disabled={saveMutation.isPending || markedCount === 0}
              onClick={() => {
                if (!allMarked) {
                  toast.message('لم تُحدَّد حالة لكل الطلاب — سيُحفظ المحدد فقط');
                }
                saveMutation.mutate();
              }}
              className="w-full rounded-full bg-gradient-to-br from-gold-soft to-gold py-3.5 text-[15px] font-extrabold text-navy disabled:opacity-60 sm:w-auto sm:min-w-[220px] sm:px-8"
            >
              {saveMutation.isPending ? 'جاري الحفظ…' : `حفظ الحضور (${markedCount})`}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function CountChip({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className="rounded-xl px-2.5 py-2 text-center" style={{ background: bg }}>
      <div className="font-latin text-[18px] font-extrabold leading-none" style={{ color }}>
        {value}
      </div>
      <div className="mt-1 text-[11px] font-bold" style={{ color }}>
        {label}
      </div>
    </div>
  );
}
