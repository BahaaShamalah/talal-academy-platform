'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { apiClient, type ExamResultsResponse } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { isTeacherOnly } from '@/lib/dashboard-routes';

type ResultMark = { score: string; teacher_notes: string };

export function ExamResultsPage({ examId }: { examId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const canManage = useAuthStore((s) => s.hasPermission('exams.manage'));
  const teacherPortal = isTeacherOnly(useAuthStore((s) => s.user));
  const listLabel = teacherPortal ? 'نتائج أعمال الطلبة' : 'الاختبارات';

  const [marks, setMarks] = useState<Record<number, ResultMark>>({});
  const [hydrated, setHydrated] = useState(false);

  const rosterQuery = useQuery({
    queryKey: ['exam-results', examId],
    queryFn: () => apiClient<ExamResultsResponse>(`/exams/${examId}/results`),
  });

  useEffect(() => {
    if (!rosterQuery.data || hydrated) return;
    const initial: Record<number, ResultMark> = {};
    for (const row of rosterQuery.data.roster) {
      initial[row.student.id] = {
        score: row.result?.score != null ? String(row.result.score) : '',
        teacher_notes: row.result?.teacher_notes ?? '',
      };
    }
    setMarks(initial);
    setHydrated(true);
  }, [rosterQuery.data, hydrated]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const results = Object.entries(marks).map(([studentId, mark]) => ({
        student_id: Number(studentId),
        score: mark.score.trim() === '' ? null : Number(mark.score),
        teacher_notes: mark.teacher_notes.trim() || null,
      }));
      return apiClient(`/exams/${examId}/results`, {
        method: 'POST',
        body: JSON.stringify({ results }),
      });
    },
    onSuccess: () => {
      toast.success('تم حفظ النتائج');
      qc.invalidateQueries({ queryKey: ['exam-results', examId] });
      qc.invalidateQueries({ queryKey: ['exams'] });
      qc.invalidateQueries({ queryKey: ['exam-result-counts'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (rosterQuery.isLoading) {
    return (
      <>
        <AdminHeader title="تسجيل النتائج" crumb="جاري التحميل…" />
        <AdminContent className="text-[13px] text-ink-dim">جاري تحميل الروستر…</AdminContent>
      </>
    );
  }

  if (rosterQuery.isError || !rosterQuery.data) {
    return (
      <>
        <AdminHeader title="تسجيل النتائج" crumb="غير موجود" />
        <AdminContent>
          <EmptyState icon="fa-solid fa-file-circle-xmark" title="الاختبار غير موجود" body="تعذر تحميل بيانات الاختبار." primary={{ label: 'العودة', onClick: () => router.push('/dashboard/exams') }} />
        </AdminContent>
      </>
    );
  }

  const exam = rosterQuery.data.exam;
  const roster = rosterQuery.data.roster;
  const maxScore = Number(exam.max_score);

  return (
    <>
      <AdminHeader title="تسجيل النتائج" crumb={`${listLabel} ← ${exam.name}`} />
      <AdminContent className="space-y-3 pb-32">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard/exams" className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink-soft hover:text-navy">
            <Icon name="fa-solid fa-arrow-right" className="text-[11px]" />
            {listLabel}
          </Link>
        </div>

        <section className="overflow-hidden rounded-[18px] border border-cream-line bg-white p-4 sm:p-5">
          <div className="text-[11.5px] font-bold tracking-wide text-gold">EXAM</div>
          <h1 className="mt-1 font-display text-[20px] font-bold text-navy-800">{exam.name}</h1>
          <p className="mt-2 text-[14px] font-bold text-navy">
            <span className="font-latin">{exam.exam_date}</span>
            <span className="mx-1.5 text-ink-faint">·</span>
            العلامة الكاملة = {maxScore}
          </p>
        </section>

        {roster.length === 0 ? (
          <EmptyState
            icon="fa-solid fa-user-slash"
            title="لا يوجد طلاب في الشعبة"
            body="لا توجد تسجيلات نشطة لطلاب هذه الشعبة (ذكور/إناث). تأكد أن الطلاب مسجّلون في أحد عروض الشعبة."
          />
        ) : (
          <div className="space-y-2">
            {roster.map((row, index) => (
              <div key={row.student.id} className="rounded-[16px] border border-cream-line bg-white p-3.5 sm:p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-latin text-[11px] font-bold text-ink-faint">{index + 1}</span>
                      <div className="text-[15px] font-bold text-ink">{row.student.full_name}</div>
                    </div>
                    <div className="font-latin mt-0.5 text-[12px] text-ink-dim">{row.student.file_number}</div>
                  </div>
                  <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:max-w-xl">
                    <div>
                      <label className="mb-1 block text-[11.5px] font-semibold text-ink-dim">
                        الدرجة من {maxScore} (فارغ = غياب)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={maxScore}
                        step="0.01"
                        disabled={!canManage}
                        className="w-full rounded-xl border border-cream-line2 px-3 py-2.5 text-[13px]"
                        value={marks[row.student.id]?.score ?? ''}
                        onChange={(e) =>
                          setMarks((prev) => ({
                            ...prev,
                            [row.student.id]: {
                              ...(prev[row.student.id] ?? { score: '', teacher_notes: '' }),
                              score: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11.5px] font-semibold text-ink-dim">ملاحظة المعلم</label>
                      <input
                        type="text"
                        disabled={!canManage}
                        className="w-full rounded-xl border border-cream-line2 px-3 py-2.5 text-[13px]"
                        value={marks[row.student.id]?.teacher_notes ?? ''}
                        onChange={(e) =>
                          setMarks((prev) => ({
                            ...prev,
                            [row.student.id]: {
                              ...(prev[row.student.id] ?? { score: '', teacher_notes: '' }),
                              teacher_notes: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminContent>

      {canManage && roster.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-cream-line bg-white/95 px-3.5 py-3 backdrop-blur lg:right-[246px]">
          <button
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="w-full rounded-full bg-gradient-to-br from-gold-soft to-gold py-3.5 text-[15px] font-extrabold text-navy disabled:opacity-60 sm:mx-auto sm:block sm:min-w-[240px]"
          >
            {saveMutation.isPending ? 'جاري الحفظ…' : 'حفظ النتائج'}
          </button>
        </div>
      ) : null}
    </>
  );
}
