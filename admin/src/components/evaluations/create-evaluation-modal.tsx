'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { FormModal, formFieldClass, formLabelClass } from '@/components/ui/form-modal';
import {
  apiClient,
  qs,
  type ClassOffering,
  type Enrollment,
  type EvaluationLevelRating,
  type Paginated,
  type Student,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

const LEVEL_OPTIONS: { id: EvaluationLevelRating; label: string }[] = [
  { id: 'excellent', label: 'ممتاز' },
  { id: 'good', label: 'جيد' },
  { id: 'needs_follow_up', label: 'يحتاج متابعة' },
];

type EvalForm = {
  student_id: string;
  class_offering_id: string;
  numeric_score: string;
  numeric_score_max: string;
  level_rating: EvaluationLevelRating | '';
  participation_rating: number;
  understanding_rating: number;
  homework_rating: number;
  discipline_rating: number;
  note: string;
};

const emptyForm = (studentId?: string, offeringId?: string): EvalForm => ({
  student_id: studentId ?? '',
  class_offering_id: offeringId ?? '',
  numeric_score: '',
  numeric_score_max: '10',
  level_rating: '',
  participation_rating: 0,
  understanding_rating: 0,
  homework_rating: 0,
  discipline_rating: 0,
  note: '',
});

function hasContent(form: EvalForm): boolean {
  return (
    form.numeric_score.trim() !== '' ||
    form.level_rating !== '' ||
    form.participation_rating > 0 ||
    form.understanding_rating > 0 ||
    form.homework_rating > 0 ||
    form.discipline_rating > 0 ||
    form.note.trim() !== ''
  );
}

function offeringLabel(co: {
  subject?: { name?: string | null } | null;
  grade?: { name?: string } | null;
}): string {
  return `${co.subject?.name ?? 'مادة'} — ${co.grade?.name ?? 'صف'}`;
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** Fixed student (student file page). When set, student picker is hidden. */
  studentId?: number | string;
  /** Pre-select offering */
  classOfferingId?: number | string;
  onCreated?: () => void;
};

export function CreateEvaluationModal({
  open,
  onClose,
  studentId,
  classOfferingId,
  onCreated,
}: Props) {
  const user = useAuthStore((s) => s.user);
  const isTeacher = user?.roles.includes('teacher') ?? false;
  const qc = useQueryClient();

  const fixedStudentId = studentId != null && studentId !== '' ? String(studentId) : '';
  const [form, setForm] = useState(() =>
    emptyForm(fixedStudentId, classOfferingId ? String(classOfferingId) : ''),
  );
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(fixedStudentId, classOfferingId ? String(classOfferingId) : ''));
    setFormError(null);
  }, [open, fixedStudentId, classOfferingId]);

  const effectiveStudentId = fixedStudentId || form.student_id;

  const myGroupsQuery = useQuery({
    queryKey: ['me-groups'],
    queryFn: async () => {
      const res = await apiClient<{ data: ClassOffering[] } | ClassOffering[]>('/me/groups');
      return Array.isArray(res) ? res : (res.data ?? []);
    },
    enabled: open && isTeacher,
    staleTime: 60_000,
  });

  const myStudentsQuery = useQuery({
    queryKey: ['me-students'],
    queryFn: async () => {
      const res = await apiClient<{ data: Student[] } | Student[]>('/me/students');
      return Array.isArray(res) ? res : (res.data ?? []);
    },
    enabled: open && isTeacher && !fixedStudentId,
    staleTime: 60_000,
  });

  const enrollmentsQuery = useQuery({
    queryKey: ['student-active-enrollments', effectiveStudentId],
    queryFn: () =>
      apiClient<Paginated<Enrollment>>(
        `/enrollments${qs({
          'filter[student_id]': effectiveStudentId,
          'filter[status]': 'active',
          include: 'classOffering.subject,classOffering.grade',
          per_page: 100,
        })}`,
      ),
    enabled: open && Boolean(effectiveStudentId),
  });

  const myOfferingIds = useMemo(
    () => new Set((myGroupsQuery.data ?? []).map((g) => g.id)),
    [myGroupsQuery.data],
  );

  const offeringOptions = useMemo(() => {
    const enrollments = enrollmentsQuery.data?.data ?? [];
    const fromEnrollments = enrollments
      .filter((e) => {
        if (!isTeacher) return true;
        if (myGroupsQuery.isLoading) return false;
        return myOfferingIds.has(e.class_offering_id);
      })
      .map((e) => ({
        id: e.class_offering_id,
        label: e.class_offering ? offeringLabel(e.class_offering) : `عرض #${e.class_offering_id}`,
      }));

    if (fromEnrollments.length > 0) return fromEnrollments;

    // Portal path: student from /me/students already includes scoped enrollments
    if (isTeacher && !fixedStudentId) {
      const student = (myStudentsQuery.data ?? []).find((s) => String(s.id) === effectiveStudentId);
      return (student?.enrollments ?? []).map((e) => ({
        id: e.class_offering_id,
        label: e.class_offering ? offeringLabel(e.class_offering) : `عرض #${e.class_offering_id}`,
      }));
    }

    return [];
  }, [
    enrollmentsQuery.data?.data,
    isTeacher,
    myOfferingIds,
    myGroupsQuery.isLoading,
    fixedStudentId,
    myStudentsQuery.data,
    effectiveStudentId,
  ]);

  const students = useMemo(() => {
    const all = myStudentsQuery.data ?? [];
    if (!classOfferingId) return all;
    const offeringId = Number(classOfferingId);
    return all.filter((s) =>
      (s.enrollments ?? []).some((e) => e.class_offering_id === offeringId),
    );
  }, [myStudentsQuery.data, classOfferingId]);

  // Keep preset offering when student changes if still valid
  useEffect(() => {
    if (!open || !classOfferingId || !effectiveStudentId) return;
    const stillValid = offeringOptions.some((o) => String(o.id) === String(classOfferingId));
    if (stillValid) {
      setForm((f) =>
        f.class_offering_id === String(classOfferingId)
          ? f
          : { ...f, class_offering_id: String(classOfferingId) },
      );
    }
  }, [open, classOfferingId, effectiveStudentId, offeringOptions]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        class_offering_id: Number(form.class_offering_id),
        numeric_score_max: form.numeric_score_max ? Number(form.numeric_score_max) : 10,
      };
      if (form.numeric_score.trim()) payload.numeric_score = Number(form.numeric_score);
      if (form.level_rating) payload.level_rating = form.level_rating;
      if (form.participation_rating > 0) payload.participation_rating = form.participation_rating;
      if (form.understanding_rating > 0) payload.understanding_rating = form.understanding_rating;
      if (form.homework_rating > 0) payload.homework_rating = form.homework_rating;
      if (form.discipline_rating > 0) payload.discipline_rating = form.discipline_rating;
      if (form.note.trim()) payload.note = form.note.trim();

      return apiClient(`/students/${effectiveStudentId}/evaluations`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success('تم حفظ التقييم');
      void qc.invalidateQueries({ queryKey: ['student-evaluations'] });
      void qc.invalidateQueries({ queryKey: ['me-evaluations'] });
      onCreated?.();
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function submit() {
    if (!effectiveStudentId) {
      setFormError('اختر الطالب.');
      return;
    }
    if (!form.class_offering_id) {
      setFormError('اختر المادة/الصف.');
      return;
    }
    if (!hasContent(form)) {
      setFormError('أدخل درجة أو تقييمًا أو ملاحظة واحدة على الأقل.');
      return;
    }
    setFormError(null);
    saveMutation.mutate();
  }

  const offeringsLoading =
    (Boolean(effectiveStudentId) && enrollmentsQuery.isLoading) ||
    (isTeacher && myGroupsQuery.isLoading);

  return (
    <FormModal
      open={open}
      onClose={() => !saveMutation.isPending && onClose()}
      title="تقييم جديد"
      eyebrow="EVALUATION"
      wide
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={saveMutation.isPending}
            className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
          >
            إلغاء
          </button>
          <button
            type="button"
            disabled={saveMutation.isPending || offeringOptions.length === 0}
            onClick={submit}
            className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy disabled:opacity-70"
          >
            {saveMutation.isPending ? 'جاري الحفظ…' : 'حفظ التقييم'}
          </button>
        </>
      }
    >
      <div className="space-y-3.5">
        {!fixedStudentId ? (
          <div>
            <label className={formLabelClass}>الطالب</label>
            <select
              className={formFieldClass}
              value={form.student_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, student_id: e.target.value, class_offering_id: '' }))
              }
            >
              <option value="">اختر طالبًا…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.file_number})
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label className={formLabelClass}>المادة / الصف</label>
          <select
            className={formFieldClass}
            value={form.class_offering_id}
            onChange={(e) => setForm((f) => ({ ...f, class_offering_id: e.target.value }))}
            disabled={!effectiveStudentId || offeringsLoading}
          >
            <option value="">
              {!effectiveStudentId
                ? 'اختر الطالب أولًا…'
                : offeringsLoading
                  ? 'جاري التحميل…'
                  : 'اختر…'}
            </option>
            {offeringOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          {effectiveStudentId && !offeringsLoading && offeringOptions.length === 0 ? (
            <p className="mt-1.5 text-[12px] font-semibold text-[#a34b4b]">
              لا توجد مواد مسندة لك لهذا الطالب.
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={formLabelClass}>الدرجة (اختياري)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className={formFieldClass}
              value={form.numeric_score}
              onChange={(e) => setForm((f) => ({ ...f, numeric_score: e.target.value }))}
            />
          </div>
          <div>
            <label className={formLabelClass}>الحد الأقصى</label>
            <input
              type="number"
              min={0.01}
              step="0.01"
              className={formFieldClass}
              value={form.numeric_score_max}
              onChange={(e) => setForm((f) => ({ ...f, numeric_score_max: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className={formLabelClass}>التقييم العام (اختياري)</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {LEVEL_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                className={`cursor-pointer rounded-full border px-3 py-2 text-[12.5px] font-bold ${
                  form.level_rating === opt.id
                    ? 'border-navy bg-navy text-white'
                    : 'border-cream-line2 bg-white text-ink-soft'
                }`}
              >
                <input
                  type="radio"
                  name="level_rating"
                  className="sr-only"
                  checked={form.level_rating === opt.id}
                  onChange={() => setForm((f) => ({ ...f, level_rating: opt.id }))}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {(
          [
            ['participation_rating', 'المشاركة'],
            ['understanding_rating', 'الفهم'],
            ['homework_rating', 'الواجبات'],
            ['discipline_rating', 'الانضباط'],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label className={formLabelClass}>
              {label} (1–5، اختياري): {form[key] || '—'}
            </label>
            <input
              type="range"
              min={0}
              max={5}
              step={1}
              className="w-full accent-navy"
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: Number(e.target.value) }))}
            />
          </div>
        ))}

        <div>
          <label className={formLabelClass}>ملاحظة (اختياري)</label>
          <textarea
            className={`${formFieldClass} min-h-[88px]`}
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          />
        </div>

        {formError ? (
          <p className="text-[12.5px] font-semibold text-[#a34b4b]">{formError}</p>
        ) : null}
      </div>
    </FormModal>
  );
}
