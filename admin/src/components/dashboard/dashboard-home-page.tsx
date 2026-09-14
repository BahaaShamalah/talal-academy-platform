'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { StatusBadge } from '@/components/ui/status-badge';
import { apiClient, formatKwd } from '@/lib/api-client';
import { formatTimeRange12h } from '@/lib/time';
import { subjectColors } from '@/data/dashboard';

type DashboardOverview = {
  stats: {
    students_count: number;
    active_groups_count: number;
    active_offerings_count: number;
    month_revenue: string;
    attendance_rate: number;
  };
  enrollment_chart: { month: string; key: string; value: number }[];
  today_sessions: {
    id: number;
    class_offering_id: number;
    subject: string;
    teacher?: string | null;
    room?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    status: string;
  }[];
  recent_enrollments: {
    id: number;
    student: string;
    student_id: number;
    section: string;
    date?: string | null;
    amount?: string | number | null;
    status: string;
  }[];
};

const th = 'px-4 py-2.5 text-right text-[11.5px] font-bold text-ink-dim';

function subjectColor(subject: string) {
  const key = Object.keys(subjectColors).find((k) => subject.includes(k));
  return key ? subjectColors[key] : '#8a8478';
}

export function DashboardHomePage() {
  const overviewQuery = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: async () => {
      const res = await apiClient<DashboardOverview | { data: DashboardOverview }>(
        '/dashboard/overview',
      );
      return 'stats' in res ? res : res.data;
    },
    refetchInterval: 60_000,
  });

  const data = overviewQuery.data;
  const stats = data?.stats;
  const chart = data?.enrollment_chart ?? [];
  const chartMax = Math.max(...chart.map((c) => c.value), 1);
  const todaySessions = data?.today_sessions ?? [];
  const recent = data?.recent_enrollments ?? [];

  const statCards = [
    {
      icon: 'fa-solid fa-graduation-cap',
      value: stats ? String(stats.students_count) : '…',
      label: 'إجمالي الطلاب',
      note: 'الطلاب النشطون حاليًا',
    },
    {
      icon: 'fa-solid fa-users-rectangle',
      value: stats ? String(stats.active_groups_count) : '…',
      label: 'عروض المواد النشطة',
      note: stats ? `${stats.active_offerings_count} عرض` : '—',
    },
    {
      icon: 'fa-solid fa-wallet',
      value: stats ? formatKwd(stats.month_revenue).replace(' د.ك', '') : '…',
      label: 'إيرادات الشهر (د.ك)',
      note: 'فواتير مدفوعة هذا الشهر',
    },
    {
      icon: 'fa-solid fa-calendar-check',
      value: stats ? `${stats.attendance_rate}%` : '…',
      label: 'نسبة الحضور العامة',
      note: 'حاضر + متأخر من إجمالي السجلات',
    },
  ];

  return (
    <>
      <AdminHeader title="اللوحة الرئيسية" crumb="نظرة عامة على المعهد" />

      <AdminContent className="flex flex-col gap-4">
        {overviewQuery.isError ? (
          <EmptyState
            icon="fa-solid fa-triangle-exclamation"
            title="تعذر تحميل اللوحة"
            body={(overviewQuery.error as Error).message}
          />
        ) : null}

        <div className="grid grid-cols-[repeat(auto-fit,minmax(212px,1fr))] gap-3">
          {statCards.map((s) => (
            <div
              key={s.label}
              className="rounded-[18px] border border-cream-line bg-white p-4 shadow-[0_10px_24px_-20px_rgba(6,26,58,.5)]"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-gold/[.14] text-[15px] text-gold-deep">
                  <Icon name={s.icon} />
                </span>
              </div>
              <div className="font-latin mt-3 text-[31px] font-bold leading-none text-navy-800">
                {s.value}
              </div>
              <div className="mt-1.5 text-[13px] text-ink-soft">{s.label}</div>
              <div className="mt-0.5 text-[11px] text-ink-faint">{s.note}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3">
          <div className="rounded-[18px] border border-cream-line bg-white p-4">
            <div className="mb-4">
              <h2 className="font-display text-[16px] font-bold text-navy-800">التسجيلات الشهرية</h2>
              <div className="mt-0.5 text-[11.5px] text-ink-faint">آخر 6 أشهر — من بيانات التسكين الفعلية</div>
            </div>
            {overviewQuery.isLoading ? (
              <div className="flex h-[158px] items-center justify-center text-[13px] text-ink-dim">
                جاري التحميل…
              </div>
            ) : chart.every((c) => c.value === 0) ? (
              <div className="flex h-[158px] items-center justify-center text-[13px] text-ink-dim">
                لا تسجيلات في الفترة
              </div>
            ) : (
              <div className="relative flex h-[158px] items-end gap-2.5 border-b border-[#f0ece1] pb-[22px]">
                {chart.map((c, i) => (
                  <div
                    key={c.key}
                    className="relative flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                  >
                    <span className="font-latin text-[10.5px] text-ink-dim">{c.value}</span>
                    <div
                      className="w-full max-w-[38px] rounded-t-[9px] rounded-b-[4px]"
                      style={{
                        height: `${Math.max(6, Math.round((c.value / chartMax) * 100))}%`,
                        background:
                          i === chart.length - 1
                            ? 'linear-gradient(180deg,#e2c67f,#c8a24a)'
                            : 'linear-gradient(180deg,#c5cddd,#9fadc6)',
                      }}
                    />
                    <span className="absolute bottom-1 text-[11px] text-ink-faint">{c.month}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[18px] border border-cream-line bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-[16px] font-bold text-navy-800">حصص اليوم</h2>
              <Link
                href="/dashboard/attendance"
                className="text-[12px] font-semibold text-gold-deep"
              >
                الحضور ←
              </Link>
            </div>
            {overviewQuery.isLoading ? (
              <p className="py-6 text-center text-[13px] text-ink-dim">جاري التحميل…</p>
            ) : todaySessions.length === 0 ? (
              <p className="rounded-[13px] bg-cream-soft px-3 py-6 text-center text-[13px] text-ink-dim">
                لا حصص مجدولة اليوم
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {todaySessions.map((t) => (
                  <Link
                    key={t.id}
                    href={`/dashboard/sessions/${t.id}/attendance`}
                    className="flex items-center gap-3 rounded-[13px] border border-[#f0ece1] bg-cream-soft px-3 py-2.5 transition-colors hover:bg-white"
                  >
                    <span
                      className="h-[9px] w-[9px] shrink-0 rounded-full"
                      style={{ background: subjectColor(t.subject) }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-bold text-ink">{t.subject}</div>
                      <div className="text-[11.5px] text-ink-dim">
                        {[t.teacher, t.room].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </div>
                    <span className="font-latin whitespace-nowrap text-[12px] text-ink-soft">
                      {formatTimeRange12h(t.start_time, t.end_time)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex items-center justify-between border-b border-[#f0ece1] px-4 py-3.5">
            <h2 className="font-display text-[16px] font-bold text-navy-800">أحدث التسجيلات</h2>
            <Link href="/dashboard/enrollments" className="text-[12px] font-semibold text-gold-deep">
              عرض الكل ←
            </Link>
          </div>
          {overviewQuery.isLoading ? (
            <div className="p-6 text-[13px] text-ink-dim">جاري التحميل…</div>
          ) : recent.length === 0 ? (
            <EmptyState
              icon="fa-solid fa-file-signature"
              title="لا تسجيلات بعد"
              body="ستظهر هنا أحدث عمليات تسكين الطلاب في الشعب."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    <th className={th}>الطالب</th>
                    <th className={th}>الشعبة</th>
                    <th className={th}>التاريخ</th>
                    <th className={th}>المبلغ</th>
                    <th className={th}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r) => (
                    <tr key={r.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                      <td className="px-4 py-2.5 text-[13.5px] font-semibold text-ink">
                        <Link
                          href={`/dashboard/student-files/${r.student_id}`}
                          className="hover:underline"
                        >
                          {r.student}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-ink-soft">{r.section}</td>
                      <td className="font-latin px-4 py-2.5 text-[12.5px] text-ink-dim">
                        {r.date ?? '—'}
                      </td>
                      <td className="font-latin px-4 py-2.5 text-[13.5px] font-bold text-navy-800">
                        {r.amount != null ? formatKwd(r.amount) : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AdminContent>
    </>
  );
}
