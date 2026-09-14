'use client';

import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  FormModal,
  formFieldClass,
  formLabelClass,
} from '@/components/ui/form-modal';
import { type ClassSchedule } from '@/lib/api-client';
import {
  updateClassSchedule,
  type ScheduleConflict,
  type UpdateClassSchedulePayload,
} from '@/lib/class-schedules-api';
import { WEEKDAYS } from '@/lib/weekdays';

type FormState = {
  day_of_week: string;
  start_time: string;
  end_time: string;
};

function toTimeInput(value: string): string {
  return value?.slice(0, 5) ?? '';
}

export function EditScheduleModal({
  open,
  onClose,
  schedule,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  schedule: ClassSchedule | null;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<FormState>({
    day_of_week: '6',
    start_time: '16:00',
    end_time: '17:00',
  });
  const [pendingConflict, setPendingConflict] = useState<{
    payload: UpdateClassSchedulePayload;
    message: string;
    conflicts: ScheduleConflict[];
  } | null>(null);

  useEffect(() => {
    if (open && schedule) {
      setForm({
        day_of_week: String(schedule.day_of_week),
        start_time: toTimeInput(schedule.start_time),
        end_time: toTimeInput(schedule.end_time),
      });
      setPendingConflict(null);
    }
  }, [open, schedule]);

  const saveMutation = useMutation({
    mutationFn: (payload: UpdateClassSchedulePayload) => {
      if (!schedule) throw new Error('لا يوجد موعد');
      return updateClassSchedule(schedule.id, payload);
    },
    onSuccess: (result, payload) => {
      if (!result.ok) {
        setPendingConflict({
          payload,
          message: result.message,
          conflicts: result.conflicts,
        });
        return;
      }
      if (result.warnings.length > 0) {
        toast.warning('تم الحفظ مع تجاوز تعارض');
      } else {
        toast.success('تم تحديث الموعد');
      }
      setPendingConflict(null);
      onSuccess();
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const forceMutation = useMutation({
    mutationFn: (payload: UpdateClassSchedulePayload) => {
      if (!schedule) throw new Error('لا يوجد موعد');
      return updateClassSchedule(schedule.id, { ...payload, force: true });
    },
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.warning('تم الحفظ مع تجاوز التعارض');
      setPendingConflict(null);
      onSuccess();
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleSubmit() {
    if (!schedule) return;
    if (!form.day_of_week || !form.start_time || !form.end_time) {
      toast.error('أكمل يوم ووقت البداية والنهاية');
      return;
    }
    if (form.start_time >= form.end_time) {
      toast.error('وقت النهاية يجب أن يكون بعد البداية');
      return;
    }
    saveMutation.mutate({
      day_of_week: Number(form.day_of_week),
      start_time: form.start_time,
      end_time: form.end_time,
    });
  }

  if (!schedule) return null;

  return (
    <>
      <FormModal
        open={open}
        onClose={() => {
          if (!saveMutation.isPending && !forceMutation.isPending) onClose();
        }}
        title="تعديل موعد أسبوعي"
        eyebrow="EDIT SCHEDULE"
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
              {saveMutation.isPending ? 'جاري الحفظ…' : 'حفظ'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className={formLabelClass}>يوم الأسبوع</label>
            <select
              className={formFieldClass}
              value={form.day_of_week}
              onChange={(e) => setForm((f) => ({ ...f, day_of_week: e.target.value }))}
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
              value={form.start_time}
              onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
            />
          </div>
          <div>
            <label className={formLabelClass}>إلى</label>
            <input
              type="time"
              className={`${formFieldClass} font-latin text-left`}
              dir="ltr"
              value={form.end_time}
              onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
            />
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
              onClick={() => pendingConflict && forceMutation.mutate(pendingConflict.payload)}
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
