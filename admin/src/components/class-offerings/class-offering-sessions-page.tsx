'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { EmptyState, TableSkeleton } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  apiClient,
  qs,
  type ClassOffering,
  type ClassSession,
  type Paginated,
} from '@/lib/api-client';
import { formatTimeRange12h } from '@/lib/time';
import { useAuthStore } from '@/stores/auth-store';

export function ClassOfferingSessionsPage({ offeringId }: { offeringId: string }) {
  const router = useRouter();
  const canViewSessions = useAuthStore((s) => s.hasPermission('sessions.view'));
  const canManageAttendance = useAuthStore((s) => s.hasPermission('attendance.manage'));

  const offeringQuery = useQuery({
    queryKey: ['class-offering', offeringId],
    queryFn: () =>
      apiClient<ClassOffering>(
        `/class-offerings/${offeringId}${qs({
          include: 'subject,teacher,grade,hall',
        })}`,
      ),
    enabled: canViewSessions,
  });

  const sessionsQuery = useQuery({
    queryKey: ['class-offering-sessions', offeringId],
    queryFn: () =>
      apiClient<Paginated<ClassSession>>(
        `/class-offerings/${offeringId}/sessions${qs({ per_page: 100 })}`,
      ),
    enabled: canViewSessions,
  });

  const offering = offeringQuery.data;
  const sessions = sessionsQuery.data?.data ?? [];
  const title =
    offering?.subject?.name && offering?.grade?.name
      ? `${offering.subject.name} — ${offering.grade.name}`
      : 'جلسات عرض المادة';

  if (!canViewSessions) {
    return (
      <>
        <AdminHeader title="الجلسات" crumb="غير مصرح" />
        <AdminContent>
          <p className="text-[13.5px] text-ink-dim">ليس لديك صلاحية عرض الجلسات.</p>
        </AdminContent>
      </>
    );
  }

  if (offeringQuery.isLoading || sessionsQuery.isLoading) {
    return (
      <>
        <AdminHeader title="الجلسات" crumb="جاري التحميل…" />
        <AdminContent>
          <TableSkeleton cols={5} />
        </AdminContent>
      </>
    );
  }

  if (offeringQuery.isError || !offering) {
    return (
      <>
        <AdminHeader title="الجلسات" crumb="غير موجودة" />
        <AdminContent>
          <EmptyState
            icon="fa-solid fa-calendar-xmark"
            title="عرض المادة غير موجود"
            body="تعذر العثور على عرض المادة."
            primary={{
              label: 'العودة للقائمة',
              onClick: () => router.push('/dashboard/class-offerings'),
            }}
          />
        </AdminContent>
      </>
    );
  }

  return (
    <>
      <AdminHeader title={title} crumb="عروض المواد ← الجلسات" />

      <AdminContent className="space-y-4">
        <Link
          href={`/dashboard/class-offerings/${offeringId}`}
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink-soft hover:text-navy"
        >
          <Icon name="fa-solid fa-arrow-right" className="text-[11px]" />
          العودة لتفاصيل العرض
        </Link>

        <section className="overflow-hidden rounded-[18px] border border-cream-line bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-[20px] font-bold text-navy-800">
                {offering.subject?.name ?? 'مادة'}
              </h1>
              <p className="mt-1 text-[13px] text-ink-soft">
                {[offering.grade?.name, offering.teacher?.name].filter(Boolean).join(' — ')}
              </p>
            </div>
            <StatusBadge status={offering.status} />
          </div>
        </section>

        <section className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] px-4 py-3.5">
            <h2 className="text-[15px] font-bold text-navy-800">الجلسات</h2>
          </div>

          {sessions.length === 0 ? (
            <EmptyState
              icon="fa-solid fa-calendar-day"
              title="لا توجد جلسات بعد"
              body="تُولَّد الجلسات تلقائيًا عند تحديد الجدول الأسبوعي لعرض هذه المادة."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {['التاريخ', 'الوقت', 'الحالة', 'حضور / غياب', ''].map((c, i) => (
                      <th
                        key={`${c}-${i}`}
                        className="whitespace-nowrap px-4 py-3 text-right text-[11.5px] font-bold text-ink-dim"
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => {
                    const hasMarks = (session.marked_count ?? 0) > 0;
                    return (
                      <tr key={session.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                        <td className="font-latin whitespace-nowrap px-4 py-3 text-[13px] font-bold text-ink">
                          {session.session_date}
                        </td>
                        <td className="font-latin whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                          {formatTimeRange12h(session.start_time, session.end_time)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={session.status} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                          {hasMarks
                            ? `${session.present_count ?? 0} حاضر / ${session.absent_count ?? 0} غائب`
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {canManageAttendance ? (
                            <Link
                              href={`/dashboard/sessions/${session.id}/attendance`}
                              className="inline-flex items-center gap-1.5 rounded-full border border-cream-line2 bg-white px-3 py-1.5 text-[12px] font-bold text-navy hover:bg-cream-soft"
                            >
                              <Icon name="fa-solid fa-clipboard-user" className="text-[11px]" />
                              أخذ الحضور
                            </Link>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </AdminContent>
    </>
  );
}
