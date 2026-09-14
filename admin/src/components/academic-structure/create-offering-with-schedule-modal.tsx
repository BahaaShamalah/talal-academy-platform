'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  FormModal,
  formFieldClass,
  formLabelClass,
} from '@/components/ui/form-modal';
import { Icon } from '@/components/ui/icon';
import {
  apiClient,
  qs,
  unwrapResource,
  type AcademicPeriod,
  type ClassOffering,
  type ClassOfferingGender,
  type Hall,
  type Paginated,
  type TeacherUser,
} from '@/lib/api-client';
import {
  createClassSchedule,
  type CreateClassSchedulePayload,
  type ScheduleConflict,
} from '@/lib/class-schedules-api';
import { WEEKDAYS } from '@/lib/weekdays';

type ScheduleRow = {
  day_of_week: string;
  start_time: string;
  end_time: string;
};

const emptyScheduleRow: ScheduleRow = {
  day_of_week: '6',
  start_time: '16:00',
  end_time: '17:00',
};

type FormState = {
  teacher_id: string;
  hall_id: string;
  period_id: string;
};

const emptyForm: FormState = {
  teacher_id: '',
  hall_id: '',
  period_id: '',
};

export function CreateOfferingWithScheduleModal({
  open,
  onClose,
  gradeId,
  gradeSectionId,
  subjectId,
  subjectName,
  gender,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  gradeId: number;
  gradeSectionId?: number | null;
  subjectId: number;
  subjectName: string;
  gender: ClassOfferingGender;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([{ ...emptyScheduleRow }]);
  const [pendingConflict, setPendingConflict] = useState<{
    offeringId: number;
    remaining: CreateClassSchedulePayload[];
    payload: CreateClassSchedulePayload;
    message: string;
    conflicts: ScheduleConflict[];
  } | null>(null);

  const teachersQuery = useQuery({
    queryKey: ['teachers', 'subject', subjectId],
    queryFn: () =>
      apiClient<Paginated<TeacherUser>>(
        `/teachers${qs({ per_page: 100, 'filter[subject_id]': subjectId })}`,
      ),
    enabled: open && Boolean(subjectId),
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

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setSchedules([{ ...emptyScheduleRow }]);
      setPendingConflict(null);
    }
  }, [open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        grade_id: gradeId,
        subject_id: subjectId,
        teacher_id: Number(form.teacher_id),
        hall_id: Number(form.hall_id),
        gender,
        status: 'active',
      };
      if (gradeSectionId != null) {
        payload.grade_section_id = gradeSectionId;
      }
      if (form.period_id.trim()) {
        payload.period_id = Number(form.period_id);
      }

      const offeringRes = await apiClient<{ data: ClassOffering }>('/class-offerings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const offering = unwrapResource<ClassOffering>(offeringRes);

      const schedulePayloads: CreateClassSchedulePayload[] = schedules.map((s) => ({
        class_offering_id: offering.id,
        day_of_week: Number(s.day_of_week),
        start_time: s.start_time,
        end_time: s.end_time,
      }));

      for (const sp of schedulePayloads) {
        const result = await createClassSchedule(sp);
        if (!result.ok) {
          return {
            conflict: true as const,
            offeringId: offering.id,
            remaining: schedulePayloads.filter((p) => p !== sp),
            payload: sp,
            message: result.message,
            conflicts: result.conflicts,
          };
        }
        if (result.warnings.length > 0) {
          toast.warning('تم الحفظ مع تجاوز تعارض');
        }
      }

      return { conflict: false as const, offeringId: offering.id };
    },
    onSuccess: (result) => {
      if (result.conflict) {
        setPendingConflict({
          offeringId: result.offeringId,
          remaining: result.remaining,
          payload: result.payload,
          message: result.message,
          conflicts: result.conflicts,
        });
        return;
      }
      toast.success('تم إنشاء الجدول والمواعيد');
      onSuccess();
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const forceMutation = useMutation({
    mutationFn: async () => {
      if (!pendingConflict) return;
      const result = await createClassSchedule({ ...pendingConflict.payload, force: true });
      if (!result.ok) {
        throw new Error(result.message);
      }

      for (const sp of pendingConflict.remaining) {
        const next = await createClassSchedule(sp);
        if (!next.ok) {
          setPendingConflict({
            offeringId: pendingConflict.offeringId,
            remaining: pendingConflict.remaining.filter((p) => p !== sp),
            payload: sp,
            message: next.message,
            conflicts: next.conflicts,
          });
          return { done: false as const };
        }
      }
      return { done: true as const };
    },
    onSuccess: (result) => {
      if (!result?.done) return;
      toast.warning('تم الحفظ مع تجاوز التعارض');
      setPendingConflict(null);
      onSuccess();
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function addScheduleRow() {
    setSchedules((prev) => [...prev, { ...emptyScheduleRow }]);
  }

  function updateScheduleRow(index: number, patch: Partial<ScheduleRow>) {
    setSchedules((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeScheduleRow(index: number) {
    setSchedules((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function handleSubmit() {
    if (!form.teacher_id || !form.hall_id) {
      toast.error('اختر المعلم والقاعة');
      return;
    }
    for (const s of schedules) {
      if (!s.day_of_week || !s.start_time || !s.end_time) {
        toast.error('أكمل كل المواعيد');
        return;
      }
      if (s.start_time >= s.end_time) {
        toast.error('وقت النهاية يجب أن يكون بعد البداية');
        return;
      }
    }
    saveMutation.mutate();
  }

  const teachers = teachersQuery.data?.data ?? [];
  const halls = hallsQuery.data?.data ?? [];
  const periods = periodsQuery.data?.data ?? [];
  const genderLabel = gender === 'male' ? 'ذكور' : 'إناث';

  return (
    <>
      <FormModal
        open={open}
        onClose={() => {
          if (!saveMutation.isPending && !forceMutation.isPending) onClose();
        }}
        title={`جدول جديد — ${subjectName} (${genderLabel})`}
        eyebrow="NEW OFFERING"
        wide
        extraWide
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
              onClick={handleSubmit}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy disabled:opacity-70"
            >
              {saveMutation.isPending ? 'جاري الحفظ…' : 'حفظ الجدول'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={formLabelClass}>المعلم</label>
              <select
                className={formFieldClass}
                value={form.teacher_id}
                onChange={(e) => setForm((f) => ({ ...f, teacher_id: e.target.value }))}
              >
                <option value="">
                  {teachers.length === 0 ? 'لا معلم بهذا التخصص' : 'اختر المعلم'}
                </option>
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

          <div className="rounded-xl border border-cream-line bg-cream-soft/40 p-3.5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className={formLabelClass}>المواعيد الأسبوعية</p>
              <button
                type="button"
                onClick={addScheduleRow}
                className="flex items-center gap-1.5 text-[12px] font-bold text-gold"
              >
                <Icon name="fa-solid fa-plus" className="text-[10px]" /> إضافة موعد آخر
              </button>
            </div>
            <div className="space-y-3">
              {schedules.map((row, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 gap-2 rounded-lg border border-cream-line bg-white p-2.5 sm:grid-cols-[1fr_1fr_1fr_auto]"
                >
                  <div>
                    <label className={formLabelClass}>اليوم</label>
                    <select
                      className={formFieldClass}
                      value={row.day_of_week}
                      onChange={(e) => updateScheduleRow(index, { day_of_week: e.target.value })}
                    >
                      {WEEKDAYS.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={formLabelClass}>من</label>
                    <input
                      type="time"
                      className={`${formFieldClass} font-latin text-left`}
                      dir="ltr"
                      value={row.start_time}
                      onChange={(e) => updateScheduleRow(index, { start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={formLabelClass}>إلى</label>
                    <input
                      type="time"
                      className={`${formFieldClass} font-latin text-left`}
                      dir="ltr"
                      value={row.end_time}
                      onChange={(e) => updateScheduleRow(index, { end_time: e.target.value })}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      aria-label="حذف الموعد"
                      disabled={schedules.length <= 1}
                      onClick={() => removeScheduleRow(index)}
                      className="h-[42px] w-[42px] rounded-lg border border-[#f2dede] text-[#a34b4b] disabled:opacity-40"
                    >
                      <Icon name="fa-solid fa-trash" className="text-[11px]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </FormModal>

      <FormModal
        open={Boolean(pendingConflict)}
        onClose={() => {
          if (!forceMutation.isPending) setPendingConflict(null);
        }}
        title="تعارض في الجدول"
        eyebrow="SCHEDULE CONFLICT"
        footer={
          <>
            <button
              type="button"
              onClick={() => setPendingConflict(null)}
              className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={forceMutation.isPending}
              onClick={() => forceMutation.mutate()}
              className="rounded-full bg-[#8a6a20] px-5 py-2.5 text-[13.5px] font-extrabold text-white disabled:opacity-70"
            >
              {forceMutation.isPending ? 'جاري التجاوز…' : 'تجاوز التعارض'}
            </button>
          </>
        }
      >
        <p className="mb-3 text-[13.5px] font-semibold text-[#a34b4b]">
          {pendingConflict?.message ?? 'تعارض في الجدول الأسبوعي.'}
        </p>
        <ul className="space-y-2">
          {(pendingConflict?.conflicts ?? []).map((c, i) => (
            <li
              key={`${c.schedule_id}-${c.resource}-${i}`}
              className="rounded-[12px] border border-[#ead9b0] bg-[#f7f0e1] px-3 py-2.5 text-[13px] text-[#5c4a20]"
            >
              {c.message}
            </li>
          ))}
        </ul>
      </FormModal>
    </>
  );
}
