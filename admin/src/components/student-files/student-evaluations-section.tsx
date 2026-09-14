'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { CreateEvaluationModal } from '@/components/evaluations/create-evaluation-modal';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { Icon } from '@/components/ui/icon';
import { apiClient, qs, type Evaluation, type Paginated } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

export function StudentEvaluationsSection({ studentId }: { studentId: string }) {
  const canView = useAuthStore((s) => s.hasPermission('evaluations.view'));
  const canManage = useAuthStore((s) => s.hasPermission('evaluations.manage'));
  const [modalOpen, setModalOpen] = useState(false);

  const evaluationsQuery = useQuery({
    queryKey: ['student-evaluations', studentId],
    queryFn: () =>
      apiClient<Paginated<Evaluation>>(
        `/students/${studentId}/evaluations${qs({
          include: 'classOffering.subject,classOffering.grade,creator',
          per_page: 50,
        })}`,
      ),
    enabled: canView,
  });

  const rows = evaluationsQuery.data?.data ?? [];

  if (!canView) return null;

  return (
    <>
      {evaluationsQuery.isLoading ? (
        <p className="text-[13px] text-ink-dim">جاري التحميل…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon="fa-solid fa-star-half-stroke"
          title="لا توجد تقييمات"
          body="لم يُسجَّل أي تقييم لهذا الطالب بعد."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="bg-cream-soft">
                {['المادة', 'التاريخ', 'الدرجة', 'التقييم', 'المعلم'].map((c) => (
                  <th
                    key={c}
                    className="whitespace-nowrap px-3 py-2.5 text-right text-[11.5px] font-bold text-ink-dim"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[#f4f1ea]">
                  <td className="px-3 py-2.5 text-[13px] font-bold text-ink">
                    {row.class_offering?.subject?.name ?? '—'}
                    {row.class_offering?.grade?.name ? (
                      <span className="mt-0.5 block text-[11.5px] font-semibold text-ink-dim">
                        {row.class_offering.grade.name}
                      </span>
                    ) : null}
                  </td>
                  <td className="font-latin whitespace-nowrap px-3 py-2.5 text-[12.5px] text-ink-soft">
                    {row.created_at ? String(row.created_at).slice(0, 10) : '—'}
                  </td>
                  <td className="font-latin whitespace-nowrap px-3 py-2.5 text-[12.5px]">
                    {row.numeric_score != null
                      ? `${row.numeric_score} / ${row.numeric_score_max ?? 10}`
                      : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    {row.level_rating ? <StatusBadge status={row.level_rating} /> : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-[13px] text-ink-soft">
                    {row.creator?.name ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canManage ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-[13px] font-extrabold text-navy"
          >
            <Icon name="fa-solid fa-plus" className="text-[11px]" />
            تقييم جديد
          </button>
        </div>
      ) : null}

      <CreateEvaluationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        studentId={studentId}
      />
    </>
  );
}
