'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { ClassOfferingScheduleModal } from '@/components/class-offerings/class-offering-schedule-modal';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { EmptyState } from '@/components/ui/empty-state';
import { FormModal } from '@/components/ui/form-modal';
import { Icon } from '@/components/ui/icon';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  apiClient,
  qs,
  type ClassOffering,
  type Paginated,
  type Student,
} from '@/lib/api-client';
import { formatScheduleSlot } from '@/lib/weekdays';
import { useAuthStore } from '@/stores/auth-store';

export function ClassOfferingDetailPage({ offeringId }: { offeringId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const canManageSchedules = useAuthStore((s) => s.hasPermission('class-schedules.manage'));
  const canViewSessions = useAuthStore((s) => s.hasPermission('sessions.view'));
  const canViewEnrollments = useAuthStore((s) => s.hasPermission('enrollments.view'));
  const canManageEnrollments = useAuthStore((s) => s.hasPermission('enrollments.manage'));

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [waitingOpen, setWaitingOpen] = useState(false);
  const [enrollStudentId, setEnrollStudentId] = useState('');

  const offeringQuery = useQuery({
    queryKey: ['class-offering', offeringId],
    queryFn: () =>
      apiClient<ClassOffering>(
        `/class-offerings/${offeringId}${qs({
          include: 'grade,subject,teacher,hall,period,schedules',
        })}`,
      ),
  });

  const enrolledQuery = useQuery({
    queryKey: ['class-offering-enrolled', offeringId],
    queryFn: () =>
      apiClient<Paginated<unknown>>(
        `/enrollments${qs({
          per_page: 1,
          'filter[class_offering_id]': offeringId,
          'filter[status]': 'active',
        })}`,
      ),
    enabled: Boolean(offeringQuery.data),
  });

  const waitingQuery = useQuery({
    queryKey: ['class-offering-waiting', offeringId],
    queryFn: async () => {
      const page = await apiClient<Paginated<Student> | Student[]>(
        `/class-offerings/${offeringId}/waiting-list`,
      );
      return Array.isArray(page) ? page : (page.data ?? []);
    },
    enabled: canViewEnrollments && waitingOpen,
  });

  const offering = offeringQuery.data;
  const schedules = offering?.schedules ?? [];
  const enrolledCount = enrolledQuery.data?.meta?.total ?? 0;
  const waitingStudents = waitingQuery.data ?? [];

  const enrollMutation = useMutation({
    mutationFn: (studentId: number) =>
      apiClient(`/class-offerings/${offeringId}/enroll-from-waiting-list`, {
        method: 'POST',
        body: JSON.stringify({ student_id: studentId }),
      }),
    onSuccess: () => {
      toast.success('تم تسكين الطالب');
      setEnrollStudentId('');
      qc.invalidateQueries({ queryKey: ['class-offering-waiting', offeringId] });
      qc.invalidateQueries({ queryKey: ['class-offering-enrolled', offeringId] });
      qc.invalidateQueries({ queryKey: ['enrollment-students'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (offeringQuery.isLoading) {
    return (
      <>
        <AdminHeader title="تفاصيل عرض المادة" crumb="جاري التحميل…" />
        <AdminContent className="text-[13px] text-ink-dim">جاري التحميل…</AdminContent>
      </>
    );
  }

  if (offeringQuery.isError || !offering) {
    return (
      <>
        <AdminHeader title="تفاصيل عرض المادة" crumb="غير موجود" />
        <AdminContent>
          <EmptyState
            icon="fa-solid fa-calendar-xmark"
            title="عرض المادة غير موجود"
            body="تعذر العثور على هذا العرض."
            primary={{
              label: 'العودة للقائمة',
              onClick: () => router.push('/dashboard/class-offerings'),
            }}
          />
        </AdminContent>
      </>
    );
  }

  const title = [offering.subject?.name, offering.grade?.name].filter(Boolean).join(' — ');

  return (
    <>
      <AdminHeader title={title || 'عرض مادة'} crumb="عروض المواد ← التفاصيل" />

      <AdminContent className="space-y-4">
        <Link
          href="/dashboard/class-offerings"
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink-soft hover:text-navy"
        >
          <Icon name="fa-solid fa-arrow-right" className="text-[11px]" />
          العودة للقائمة
        </Link>

        <section className="overflow-hidden rounded-[18px] border border-cream-line bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-[22px] font-bold text-navy-800">
                {offering.subject?.name ?? 'مادة'}
              </h1>
              <p className="mt-1 text-[13.5px] text-ink-soft">
                {[offering.grade?.name, offering.teacher?.name, offering.hall?.name]
                  .filter(Boolean)
                  .join(' — ')}
              </p>
              {offering.period?.name ? (
                <p className="mt-1 text-[12.5px] text-ink-dim">الفترة: {offering.period.name}</p>
              ) : null}
              <p className="mt-2 text-[12px] text-ink-dim">
                <span className="font-bold text-navy-800">{enrolledCount}</span> طالب مسجّل
              </p>
            </div>
            <StatusBadge status={offering.status} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(canManageSchedules || schedules.length > 0) ? (
              <button
                type="button"
                onClick={() => setScheduleOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-cream-line bg-white px-3.5 py-2 text-[12.5px] font-bold text-navy"
              >
                <Icon name="fa-solid fa-calendar-week" className="text-[11px]" />
                إدارة الجدول
              </button>
            ) : null}
            {canViewSessions ? (
              <Link
                href={`/dashboard/class-offerings/${offeringId}/sessions`}
                className="inline-flex items-center gap-1.5 rounded-full border border-cream-line bg-white px-3.5 py-2 text-[12.5px] font-bold text-navy"
              >
                <Icon name="fa-solid fa-calendar-days" className="text-[11px]" />
                الجلسات
              </Link>
            ) : null}
            {canViewEnrollments ? (
              <button
                type="button"
                onClick={() => setWaitingOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#ead9b0] bg-[#f7f0e1] px-3.5 py-2 text-[12.5px] font-bold text-[#8a6a20]"
              >
                <Icon name="fa-solid fa-hourglass-half" className="text-[11px]" />
                تعارضات الجدول
              </button>
            ) : null}
          </div>
        </section>

        <section className="overflow-hidden rounded-[18px] border border-cream-line bg-white p-4 sm:p-5">
          <h2 className="mb-3 text-[15px] font-bold text-navy-800">الجدول الأسبوعي</h2>
          {schedules.length === 0 ? (
            <p className="rounded-xl border border-[#f2dede] bg-[#fdf6f6] px-3 py-2.5 text-[13px] text-[#a34b4b]">
              لا يوجد جدول أسبوعي — لن تُولَّد جلسات بدون موعد محدد.
            </p>
          ) : (
            <div className="space-y-2">
              {schedules.map((s) => (
                <div
                  key={s.id}
                  className="font-latin rounded-[10px] border border-cream-line bg-cream-soft/40 px-3 py-2 text-[13px] font-semibold text-ink"
                  dir="ltr"
                >
                  {formatScheduleSlot(s.day_of_week, s.start_time, s.end_time)}
                </div>
              ))}
            </div>
          )}
        </section>
      </AdminContent>

      <ClassOfferingScheduleModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        offering={offering}
        canManage={canManageSchedules}
      />

      <FormModal
        open={waitingOpen}
        onClose={() => {
          if (!enrollMutation.isPending) setWaitingOpen(false);
        }}
        title={`تعارضات الجدول — ${offering.subject?.name ?? ''}`}
        eyebrow="SCHEDULE CONFLICTS"
        footer={
          <button
            type="button"
            onClick={() => setWaitingOpen(false)}
            className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
          >
            إغلاق
          </button>
        }
      >
        {waitingQuery.isLoading ? (
          <p className="text-[13px] text-ink-dim">جاري التحميل…</p>
        ) : waitingStudents.length === 0 ? (
          <p className="text-[13px] text-ink-dim">لا يوجد طلاب بانتظار حل تعارض الجدول.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-[12.5px] text-ink-dim">
              طلاب مشتركون بالمادة لكن لم يُسكّنوا بسبب تعارض بمواعيدهم الحالية.
            </p>
            {waitingStudents.map((student) => (
              <div
                key={student.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-cream-line bg-cream-soft/40 px-3 py-2.5"
              >
                <div>
                  <div className="text-[13.5px] font-bold text-ink">{student.full_name}</div>
                  <div className="font-latin text-[11.5px] text-ink-dim">{student.file_number}</div>
                </div>
                {canManageEnrollments ? (
                  <button
                    type="button"
                    disabled={enrollMutation.isPending}
                    onClick={() => {
                      setEnrollStudentId(String(student.id));
                      enrollMutation.mutate(student.id);
                    }}
                    className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-3.5 py-1.5 text-[12px] font-extrabold text-navy disabled:opacity-60"
                  >
                    {enrollMutation.isPending && enrollStudentId === String(student.id)
                      ? 'جاري…'
                      : 'تسجيل'}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </FormModal>
    </>
  );
}
