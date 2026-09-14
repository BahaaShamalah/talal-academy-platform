'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { EmptyState, TableSkeleton } from '@/components/ui/empty-state';
import { FormModal, formFieldClass, formLabelClass } from '@/components/ui/form-modal';
import { Icon } from '@/components/ui/icon';
import {
  apiClient,
  qs,
  type AcademicPeriod,
  type ClassOffering,
  type Exam,
  type ExamResultsResponse,
  type Paginated,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { isTeacherOnly } from '@/lib/dashboard-routes';

type ExamForm = {
  name: string;
  exam_date: string;
  class_offering_id: string;
  max_score: string;
};

const emptyForm = (): ExamForm => ({
  name: '',
  exam_date: new Date().toISOString().slice(0, 10),
  class_offering_id: '',
  max_score: '10',
});

function offeringLabel(co: {
  id: number;
  subject?: { name?: string | null } | null;
  grade?: { name?: string } | null;
}) {
  const subject = co.subject?.name ?? 'مادة';
  const grade = co.grade?.name ?? 'صف';
  return `${subject} — ${grade}`;
}

export function ExamsPage() {
  const canView = useAuthStore((s) => s.hasPermission('exams.view'));
  const canManage = useAuthStore((s) => s.hasPermission('exams.manage'));
  const user = useAuthStore((s) => s.user);
  const isTeacher = user?.roles.includes('teacher') ?? false;
  const teacherPortal = isTeacherOnly(user);
  const pageTitle = teacherPortal ? 'نتائج أعمال الطلبة' : 'الاختبارات';
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ExamForm>(emptyForm);

  const examsQuery = useQuery({
    queryKey: ['exams'],
    queryFn: () =>
      apiClient<Paginated<Exam>>(
        `/exams${qs({ include: 'classOffering.subject,classOffering.grade', per_page: 100 })}`,
      ),
    enabled: canView,
  });

  const periodsQuery = useQuery({
    queryKey: ['academic-periods-active'],
    queryFn: () => apiClient<Paginated<AcademicPeriod>>(`/academic-periods${qs({ per_page: 100 })}`),
    enabled: canManage && modalOpen,
    retry: false,
  });

  const offeringsQuery = useQuery({
    queryKey: isTeacher ? ['me-groups'] : ['class-offerings-exams'],
    queryFn: async () => {
      if (isTeacher) {
        const res = await apiClient<{ data: ClassOffering[] } | ClassOffering[]>('/me/groups');
        return Array.isArray(res) ? res : (res.data ?? []);
      }
      const res = await apiClient<Paginated<ClassOffering>>(
        `/class-offerings${qs({ per_page: 500, include: 'subject,grade,teacher,period' })}`,
      );
      return res.data ?? [];
    },
    enabled: canManage && modalOpen,
  });

  const activePeriod = useMemo(
    () => periodsQuery.data?.data.find((p) => p.status === 'active'),
    [periodsQuery.data?.data],
  );

  const offerings = offeringsQuery.data ?? [];

  const selectedOffering = useMemo(
    () => offerings.find((o) => String(o.id) === form.class_offering_id) ?? null,
    [offerings, form.class_offering_id],
  );

  /** Prefer offering period (works for teachers without periods.view), then active period from API. */
  const periodIdForCreate = useMemo(() => {
    if (selectedOffering?.period_id) return selectedOffering.period_id;
    if (selectedOffering?.period?.id) return selectedOffering.period.id;
    if (activePeriod?.id) return activePeriod.id;
    const fromOfferings = offerings.find((o) => o.period_id || o.period?.id);
    return fromOfferings?.period_id ?? fromOfferings?.period?.id ?? null;
  }, [selectedOffering, activePeriod, offerings]);

  const periodResolved =
    Boolean(periodIdForCreate) ||
    offerings.some((o) => Boolean(o.period_id || o.period?.id)) ||
    Boolean(activePeriod);

  const exams = examsQuery.data?.data ?? [];

  const resultCountsQuery = useQuery({
    queryKey: ['exam-result-counts', exams.map((e) => e.id).join(',')],
    queryFn: async () => {
      const counts: Record<number, number> = {};
      await Promise.all(
        exams.map(async (exam) => {
          const data = await apiClient<ExamResultsResponse>(`/exams/${exam.id}/results`);
          counts[exam.id] = data.roster.filter((r) => r.result !== null).length;
        }),
      );
      return counts;
    },
    enabled: canView && exams.length > 0,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!periodIdForCreate) {
        throw new Error('لا توجد فترة دراسية مرتبطة بهذا العرض. راجع إعدادات العرض أو فعّل فترة نشطة.');
      }
      return apiClient('/exams', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          exam_date: form.exam_date,
          class_offering_id: Number(form.class_offering_id),
          max_score: Number(form.max_score),
          period_id: periodIdForCreate,
        }),
      });
    },
    onSuccess: () => {
      toast.success('تم إنشاء الاختبار');
      setModalOpen(false);
      setForm(emptyForm());
      qc.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!canView) {
    return (
      <>
        <AdminHeader title={pageTitle} crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">ليس لديك صلاحية الوصول.</AdminContent>
      </>
    );
  }

  return (
    <>
      <AdminHeader title={pageTitle} crumb={pageTitle} />
      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <p className="text-[13px] text-ink-dim">
              أنشئ اختبارًا ثم سجّل درجات الطلاب من «تسجيل النتائج»
            </p>
            {canManage ? (
              <button
                type="button"
                onClick={() => {
                  setForm(emptyForm());
                  setModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-[13px] font-extrabold text-navy"
              >
                <Icon name="fa-solid fa-plus" className="text-[11px]" />
                اختبار جديد
              </button>
            ) : null}
          </div>

          {examsQuery.isLoading ? (
            <TableSkeleton rows={5} />
          ) : exams.length === 0 ? (
            <EmptyState
              icon="fa-solid fa-file-circle-check"
              title="لا توجد اختبارات"
              body={
                canManage
                  ? 'أنشئ اختبارًا جديدًا ثم ادخل لتسجيل درجات الطلاب.'
                  : 'لم يُنشأ أي اختبار بعد.'
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {['الاختبار', 'المادة/الصف', 'التاريخ', 'العلامة الكاملة', 'نتائج مسجّلة', ''].map((c) => (
                      <th key={c} className="whitespace-nowrap px-4 py-3 text-right text-[11.5px] font-bold text-ink-dim">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {exams.map((exam) => (
                    <tr key={exam.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                      <td className="px-4 py-3 text-[13px] font-bold text-ink">{exam.name}</td>
                      <td className="px-4 py-3 text-[13px] text-ink-soft">
                        {exam.class_offering ? offeringLabel(exam.class_offering) : '—'}
                      </td>
                      <td className="font-latin whitespace-nowrap px-4 py-3 text-[12.5px]">{exam.exam_date}</td>
                      <td className="font-latin px-4 py-3 text-[12.5px]">{exam.max_score}</td>
                      <td className="font-latin px-4 py-3 text-[12.5px]">
                        {resultCountsQuery.isLoading ? '…' : (resultCountsQuery.data?.[exam.id] ?? 0)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/exams/${exam.id}/results`}
                          className="inline-flex items-center gap-1 rounded-full border border-cream-line2 px-2.5 py-1 text-[11.5px] font-semibold text-navy"
                        >
                          <Icon name="fa-solid fa-pen-to-square" className="text-[10px]" />
                          تسجيل النتائج
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AdminContent>

      <FormModal
        open={modalOpen}
        onClose={() => !saveMutation.isPending && setModalOpen(false)}
        title="اختبار جديد"
        eyebrow="EXAM"
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={
                saveMutation.isPending ||
                !form.name.trim() ||
                !form.class_offering_id ||
                !periodIdForCreate
              }
              onClick={() => saveMutation.mutate()}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy disabled:opacity-70"
            >
              {saveMutation.isPending ? 'جاري الإنشاء…' : 'إنشاء'}
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          {offeringsQuery.isLoading ? (
            <p className="text-[13px] text-ink-dim">جاري تحميل المواد…</p>
          ) : offerings.length === 0 ? (
            <p className="rounded-xl bg-[#f8ecec] px-3 py-2.5 text-[12.5px] font-semibold text-[#a34b4b]">
              لا توجد شعب مسندة إليك. لا يمكن إنشاء اختبار قبل تعيين عرض مادة.
            </p>
          ) : null}

          {!offeringsQuery.isLoading && !periodResolved ? (
            <p className="rounded-xl bg-[#f7f0e1] px-3 py-2.5 text-[12.5px] font-semibold text-[#8a6a20]">
              لا توجد فترة دراسية مرتبطة بعروضك. اطلب من الإدارة ربط الصف بفترة نشطة.
            </p>
          ) : null}

          <div>
            <label className={formLabelClass}>اسم الاختبار</label>
            <input
              className={formFieldClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={formLabelClass}>التاريخ</label>
              <input
                type="date"
                className={formFieldClass}
                value={form.exam_date}
                onChange={(e) => setForm((f) => ({ ...f, exam_date: e.target.value }))}
              />
            </div>
            <div>
              <label className={formLabelClass}>العلامة الكاملة</label>
              <input
                type="number"
                min={0.01}
                step="0.01"
                className={formFieldClass}
                value={form.max_score}
                onChange={(e) => setForm((f) => ({ ...f, max_score: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className={formLabelClass}>المادة / الصف</label>
            <select
              className={formFieldClass}
              value={form.class_offering_id}
              onChange={(e) => setForm((f) => ({ ...f, class_offering_id: e.target.value }))}
            >
              <option value="">اختر…</option>
              {offerings.map((o) => (
                <option key={o.id} value={o.id}>
                  {offeringLabel(o)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </FormModal>
    </>
  );
}
