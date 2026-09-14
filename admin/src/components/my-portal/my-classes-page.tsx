'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { CreateEvaluationModal } from '@/components/evaluations/create-evaluation-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { apiClient, type ClassOffering } from '@/lib/api-client';
import { formatScheduleSlot } from '@/lib/weekdays';
import { useAuthStore } from '@/stores/auth-store';

export function MyClassesPage() {
  const user = useAuthStore((s) => s.user);
  const isTeacher = user?.roles.includes('teacher') ?? false;
  const canViewClasses = useAuthStore((s) => s.hasPermission('teacher-portal.classes'));
  const canManageEvaluations = useAuthStore((s) => s.hasPermission('evaluations.manage'));
  const [evalModal, setEvalModal] = useState<{
    open: boolean;
    classOfferingId?: number;
  }>({ open: false });

  const groupsQuery = useQuery({
    queryKey: ['me-groups'],
    queryFn: async () => {
      const res = await apiClient<{ data: ClassOffering[] } | ClassOffering[]>('/me/groups');
      return Array.isArray(res) ? res : (res.data ?? []);
    },
    enabled: isTeacher && canViewClasses,
    staleTime: 60_000,
  });

  const groups = groupsQuery.data ?? [];

  if (!isTeacher || !canViewClasses) {
    return (
      <>
        <AdminHeader title="صفوفي" crumb="غير متاح" />
        <AdminContent>
          <EmptyState
            icon="fa-solid fa-user-lock"
            title={!isTeacher ? 'هذه الصفحة للمعلمين' : 'غير مصرح'}
            body={
              !isTeacher
                ? 'لا يوجد دور معلم مرتبط بحسابك.'
                : 'ليس لديك صلاحية عرض صفوفك.'
            }
          />
        </AdminContent>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="صفوفي" crumb="الشؤون الأكاديمية ← صفوفي" />

      <AdminContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] text-ink-soft">
            الصفوف والمواد المسندة إليك
            {!groupsQuery.isLoading ? (
              <span className="ms-1 font-bold text-navy">({groups.length})</span>
            ) : null}
          </p>
          <Link
            href="/dashboard/my-portal"
            className="text-[12px] font-bold text-gold-deep hover:underline"
          >
            ← العودة لبوابتي
          </Link>
        </div>

        {groupsQuery.isLoading ? (
          <div className="rounded-[18px] border border-cream-line bg-white p-5 text-[13px] text-ink-dim">
            جاري التحميل…
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            icon="fa-solid fa-chalkboard"
            title="لا توجد صفوف مسندة"
            body="لم يُعيَّن لك أي صف / مادة بعد."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {groups.map((g) => (
              <article
                key={g.id}
                className="flex flex-col rounded-[18px] border border-cream-line bg-white p-4"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-extrabold text-navy-800">
                      {g.subject?.name ?? 'مادة'}
                    </h3>
                    <p className="mt-1 text-[12.5px] text-ink-soft">
                      {[
                        g.grade?.name,
                        g.gender === 'male' ? 'ذكور' : g.gender === 'female' ? 'إناث' : null,
                        g.grade_section?.name,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-cream-soft px-2.5 py-1 text-[11px] font-bold text-navy-800">
                    {g.active_students_count ?? 0} طالب
                  </span>
                </div>

                {(g.schedules ?? []).length > 0 ? (
                  <ul className="mb-3 space-y-1 border-t border-[#f4f1ea] pt-3 text-[12px] text-ink-soft">
                    {g.schedules!.map((s) => (
                      <li key={s.id} className="flex items-center gap-1.5">
                        <Icon name="fa-regular fa-clock" className="text-[10px] text-gold" />
                        {formatScheduleSlot(s.day_of_week, s.start_time, s.end_time)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mb-3 border-t border-[#f4f1ea] pt-3 text-[12px] text-ink-dim">
                    بدون جدول أسبوعي
                  </p>
                )}

                <div className="mt-auto flex flex-wrap gap-2 pt-1">
                  <Link
                    href={`/dashboard/class-offerings/${g.id}/sessions`}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-navy-800 px-3 py-2 text-[12px] font-extrabold text-gold"
                  >
                    <Icon name="fa-solid fa-clipboard-user" className="text-[11px]" />
                    الحضور
                  </Link>
                  {canManageEvaluations ? (
                    <button
                      type="button"
                      onClick={() => setEvalModal({ open: true, classOfferingId: g.id })}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-cream-line2 bg-cream-soft px-3 py-2 text-[12px] font-bold text-navy-800"
                    >
                      <Icon name="fa-solid fa-star" className="text-[11px] text-gold-deep" />
                      تقييم
                    </button>
                  ) : (
                    <Link
                      href="/dashboard/exams"
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-cream-line2 bg-cream-soft px-3 py-2 text-[12px] font-bold text-navy-800"
                    >
                      <Icon name="fa-solid fa-file-circle-check" className="text-[11px] text-gold-deep" />
                      نتائج أعمال الطلبة
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </AdminContent>

      <CreateEvaluationModal
        open={evalModal.open}
        onClose={() => setEvalModal({ open: false })}
        classOfferingId={evalModal.classOfferingId}
      />
    </>
  );
}
