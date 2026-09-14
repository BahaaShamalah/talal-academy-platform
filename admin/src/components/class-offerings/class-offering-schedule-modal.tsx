'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  ConfirmDialog,
  FormModal,
  formFieldClass,
  formLabelClass,
} from '@/components/ui/form-modal';
import { Icon } from '@/components/ui/icon';
import {
  createClassSchedule,
  deleteClassSchedule,
  type ScheduleConflict,
} from '@/lib/class-schedules-api';
import { patchClassOfferingSchedules, refreshClassOffering } from '@/lib/class-offering-cache';
import { type ClassOffering, type ClassSchedule } from '@/lib/api-client';
import { formatScheduleSlot, WEEKDAYS } from '@/lib/weekdays';
import { formatTime12h } from '@/lib/time';

type ScheduleForm = {
  day_of_week: string;
  start_time: string;
  end_time: string;
};

const emptyForm: ScheduleForm = {
  day_of_week: '6',
  start_time: '16:00',
  end_time: '17:00',
};

export function ClassOfferingScheduleModal({
  open,
  onClose,
  offering,
  canManage,
}: {
  open: boolean;
  onClose: () => void;
  offering: ClassOffering | null;
  canManage: boolean;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ScheduleForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ClassSchedule | null>(null);
  const [pendingConflict, setPendingConflict] = useState<{
    payload: Parameters<typeof createClassSchedule>[0];
    message: string;
    conflicts: ScheduleConflict[];
  } | null>(null);

  const schedules = offering?.schedules ?? [];
  const offeringId = offering ? String(offering.id) : '';

  const addMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createClassSchedule>[0]) => createClassSchedule(payload),
    onSuccess: async (result, payload) => {
      if (!result.ok) {
        setPendingConflict({
          payload,
          message: result.message,
          conflicts: result.conflicts,
        });
        return;
      }

      patchClassOfferingSchedules(qc, offeringId, (current) => [...current, result.data]);

      if (result.warnings.length > 0) {
        toast.warning('تم الحفظ مع تجاوز تعارض');
      } else {
        toast.success('تم إضافة الموعد');
      }
      setForm(emptyForm);
      setPendingConflict(null);
      await refreshClassOffering(qc, offeringId);
      await qc.invalidateQueries({ queryKey: ['class-offering-sessions'] });
      await qc.invalidateQueries({ queryKey: ['class-offerings'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const forceMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createClassSchedule>[0]) =>
      createClassSchedule({ ...payload, force: true }),
    onSuccess: async (result, payload) => {
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      patchClassOfferingSchedules(qc, offeringId, (current) => [...current, result.data]);

      toast.warning('تم الحفظ مع تجاوز التعارض');
      setForm(emptyForm);
      setPendingConflict(null);
      await refreshClassOffering(qc, offeringId);
      await qc.invalidateQueries({ queryKey: ['class-offering-sessions'] });
      await qc.invalidateQueries({ queryKey: ['class-offerings'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteClassSchedule(id),
    onSuccess: async (_, deletedId) => {
      if (offering) {
        patchClassOfferingSchedules(qc, offeringId, (current) =>
          current.filter((s) => s.id !== deletedId),
        );
      }
      toast.success('تم حذف الموعد');
      setDeleteTarget(null);
      await refreshClassOffering(qc, offeringId);
      await qc.invalidateQueries({ queryKey: ['class-offering-sessions'] });
      await qc.invalidateQueries({ queryKey: ['class-offerings'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleAdd() {
    if (!offering) return;
    if (!form.day_of_week || !form.start_time || !form.end_time) {
      toast.error('أكمل يوم ووقت البداية والنهاية');
      return;
    }
    if (form.start_time >= form.end_time) {
      toast.error('وقت النهاية يجب أن يكون بعد البداية');
      return;
    }

    addMutation.mutate({
      class_offering_id: offering.id,
      day_of_week: Number(form.day_of_week),
      start_time: form.start_time,
      end_time: form.end_time,
    });
  }

  if (!offering) return null;

  return (
    <>
      <FormModal
        open={open}
        onClose={() => {
          if (!addMutation.isPending && !deleteMutation.isPending && !forceMutation.isPending) {
            setPendingConflict(null);
            setForm(emptyForm);
            onClose();
          }
        }}
        title={`الجدول الأسبوعي — ${offering.subject?.name ?? ''}`}
        eyebrow="WEEKLY SCHEDULE"
        wide
        footer={
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
          >
            إغلاق
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <p className={formLabelClass}>المواعيد الحالية</p>
            {schedules.length === 0 ? (
              <p className="rounded-xl border border-[#f2dede] bg-[#fdf6f6] px-3 py-2.5 text-[13px] text-[#a34b4b]">
                لا يوجد جدول أسبوعي بعد — لن تُولَّد جلسات ولا يُسكَّن طلاب فعليًا بدون موعد.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-cream-line">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-cream-soft">
                      {['اليوم', 'من', 'إلى', ''].map((c) => (
                        <th
                          key={c}
                          className="px-3 py-2.5 text-right text-[11.5px] font-bold text-ink-dim"
                        >
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((s) => (
                      <tr key={s.id} className="border-t border-[#f4f1ea]">
                        <td className="px-3 py-2.5 text-[13px] font-semibold text-ink">
                          {WEEKDAYS.find((d) => d.id === s.day_of_week)?.label ?? '—'}
                        </td>
                        <td className="font-latin px-3 py-2.5 text-[13px] text-ink-soft" dir="ltr">
                          {formatTime12h(s.start_time)}
                        </td>
                        <td className="font-latin px-3 py-2.5 text-[13px] text-ink-soft" dir="ltr">
                          {formatTime12h(s.end_time)}
                        </td>
                        <td className="px-3 py-2.5">
                          {canManage ? (
                            <button
                              type="button"
                              aria-label="حذف الموعد"
                              onClick={() => setDeleteTarget(s)}
                              className="h-[29px] w-[29px] rounded-[8px] border border-[#f2dede] bg-white text-[#a34b4b]"
                            >
                              <Icon name="fa-solid fa-trash" className="text-[10px]" />
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {canManage ? (
            <div className="rounded-xl border border-cream-line bg-cream-soft/40 p-3.5">
              <p className={formLabelClass}>إضافة موعد أسبوعي</p>
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
              <button
                type="button"
                disabled={addMutation.isPending}
                onClick={handleAdd}
                className="mt-3 flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-[12.5px] font-extrabold text-navy disabled:opacity-60"
              >
                <Icon name="fa-solid fa-plus" className="text-[11px]" />
                {addMutation.isPending ? 'جاري الإضافة…' : 'إضافة موعد'}
              </button>
            </div>
          ) : null}
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="حذف الموعد؟"
        body={`${deleteTarget ? formatScheduleSlot(deleteTarget.day_of_week, deleteTarget.start_time, deleteTarget.end_time) : ''} — لن يُحذف ما تم توليده مسبقًا من جلسات.`}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />

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
          {pendingConflict?.message ?? 'تعارض في الجدول الأسبوعي مع عرض مادة آخر.'}
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
