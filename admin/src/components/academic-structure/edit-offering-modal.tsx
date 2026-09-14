'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  FormModal,
  formFieldClass,
  formLabelClass,
} from '@/components/ui/form-modal';
import {
  apiClient,
  qs,
  type AcademicPeriod,
  type ClassOffering,
  type GradeSection,
  type Hall,
  type Paginated,
  type TeacherUser,
} from '@/lib/api-client';

type FormState = {
  teacher_id: string;
  hall_id: string;
  period_id: string;
  grade_section_id: string;
};

const emptyForm: FormState = {
  teacher_id: '',
  hall_id: '',
  period_id: '',
  grade_section_id: '',
};

export function EditOfferingModal({
  open,
  onClose,
  offering,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  offering: ClassOffering | null;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);

  const teachersQuery = useQuery({
    queryKey: ['teachers', 'subject', offering?.subject_id],
    queryFn: () =>
      apiClient<Paginated<TeacherUser>>(
        `/teachers${qs({
          per_page: 100,
          'filter[subject_id]': offering?.subject_id,
        })}`,
      ),
    enabled: open && Boolean(offering?.subject_id),
  });

  const hallsQuery = useQuery({
    queryKey: ['halls-options'],
    queryFn: () => apiClient<Paginated<Hall>>(`/halls${qs({ per_page: 100 })}`),
    enabled: open,
  });

  const periodsQuery = useQuery({
    queryKey: ['academic-periods-options'],
    queryFn: () => apiClient<Paginated<AcademicPeriod>>(`/academic-periods${qs({ per_page: 100 })}`),
    enabled: open,
  });

  const sectionsQuery = useQuery({
    queryKey: ['grade-sections', offering?.grade_id],
    queryFn: () =>
      apiClient<Paginated<GradeSection>>(
        `/grade-sections${qs({
          per_page: 100,
          'filter[grade_id]': offering?.grade_id,
        })}`,
      ),
    enabled: open && Boolean(offering?.grade_id),
  });

  useEffect(() => {
    if (open && offering) {
      setForm({
        teacher_id: String(offering.teacher_id),
        hall_id: String(offering.hall_id),
        period_id: offering.period_id != null ? String(offering.period_id) : '',
        grade_section_id:
          offering.grade_section_id != null ? String(offering.grade_section_id) : '',
      });
    }
  }, [open, offering]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!offering) return;
      const payload: Record<string, unknown> = {
        teacher_id: Number(form.teacher_id),
        hall_id: Number(form.hall_id),
      };
      payload.period_id = form.period_id.trim() ? Number(form.period_id) : null;
      payload.grade_section_id = form.grade_section_id.trim()
        ? Number(form.grade_section_id)
        : null;
      return apiClient<ClassOffering>(`/class-offerings/${offering.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success('تم تحديث الجدول');
      onSuccess();
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const teachers = teachersQuery.data?.data ?? [];
  const halls = hallsQuery.data?.data ?? [];
  const periods = periodsQuery.data?.data ?? [];
  const sections = sectionsQuery.data?.data ?? [];

  if (!offering) return null;

  return (
    <FormModal
      open={open}
      onClose={() => !saveMutation.isPending && onClose()}
      title={`تعديل جدول — ${offering.subject?.name ?? ''}`}
      eyebrow="EDIT OFFERING"
      wide
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
          >
            إلغاء
          </button>
          <button
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => {
              if (!form.teacher_id || !form.hall_id) {
                toast.error('اختر المعلم والقاعة');
                return;
              }
              if (!form.grade_section_id.trim()) {
                toast.error('اختر الشعبة');
                return;
              }
              saveMutation.mutate();
            }}
            className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy disabled:opacity-70"
          >
            {saveMutation.isPending ? 'جاري الحفظ…' : 'حفظ التعديلات'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={formLabelClass}>الشعبة</label>
          <select
            className={formFieldClass}
            value={form.grade_section_id}
            onChange={(e) => setForm((f) => ({ ...f, grade_section_id: e.target.value }))}
          >
            <option value="">اختر الشعبة</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={formLabelClass}>المعلم</label>
          <select
            className={formFieldClass}
            value={form.teacher_id}
            onChange={(e) => setForm((f) => ({ ...f, teacher_id: e.target.value }))}
          >
            <option value="">اختر المعلم</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={formLabelClass}>القاعة</label>
          <select
            className={formFieldClass}
            value={form.hall_id}
            onChange={(e) => setForm((f) => ({ ...f, hall_id: e.target.value }))}
          >
            <option value="">اختر القاعة</option>
            {halls.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={formLabelClass}>الفترة الدراسية (اختياري)</label>
          <select
            className={formFieldClass}
            value={form.period_id}
            onChange={(e) => setForm((f) => ({ ...f, period_id: e.target.value }))}
          >
            <option value="">بدون فترة محددة</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </FormModal>
  );
}
