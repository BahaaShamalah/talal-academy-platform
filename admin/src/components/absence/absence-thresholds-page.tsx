'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { EmptyState, TableSkeleton } from '@/components/ui/empty-state';
import {
  ConfirmDialog,
  FormModal,
  formFieldClass,
  formLabelClass,
} from '@/components/ui/form-modal';
import { Icon } from '@/components/ui/icon';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  apiClient,
  qs,
  type AbsenceAlertLevel,
  type AbsenceAlertThreshold,
  type Paginated,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type ThresholdForm = {
  consecutive_absences_count: string;
  alert_level: AbsenceAlertLevel;
  is_active: boolean;
};

const emptyForm = (): ThresholdForm => ({
  consecutive_absences_count: '',
  alert_level: 'notice',
  is_active: true,
});

export function AbsenceThresholdsPage() {
  const canManage = useAuthStore((s) => s.hasPermission('absence-alerts.manage'));
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AbsenceAlertThreshold | null>(null);
  const [form, setForm] = useState<ThresholdForm>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<AbsenceAlertThreshold | null>(null);

  const query = useQuery({
    queryKey: ['absence-alert-thresholds'],
    queryFn: () =>
      apiClient<Paginated<AbsenceAlertThreshold>>(
        `/absence-alert-thresholds${qs({ per_page: 100 })}`,
      ),
    enabled: canManage,
  });

  const rows = query.data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        consecutive_absences_count: Number(form.consecutive_absences_count),
        alert_level: form.alert_level,
        is_active: form.is_active,
      };
      if (editing) {
        return apiClient(`/absence-alert-thresholds/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return apiClient('/absence-alert-thresholds', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success(editing ? 'تم التحديث' : 'تمت الإضافة');
      setModalOpen(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['absence-alert-thresholds'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/absence-alert-thresholds/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم الحذف');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['absence-alert-thresholds'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!canManage) {
    return (
      <>
        <AdminHeader title="تنبيه الغياب" crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">ليس لديك صلاحية ضبط تنبيه الغياب.</AdminContent>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="تنبيه الغياب" crumb="الحضور ← تنبيه الغياب" />
      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <p className="text-[13px] text-ink-dim">عدد أيام الغياب المتتالي قبل إصدار التنبيه</p>
            <button type="button" onClick={() => { setEditing(null); setForm(emptyForm()); setModalOpen(true); }} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-[13px] font-extrabold text-navy">
              <Icon name="fa-solid fa-plus" className="text-[11px]" />
              إعداد جديد
            </button>
          </div>
          {query.isLoading ? <TableSkeleton rows={3} /> : rows.length === 0 ? (
            <EmptyState icon="fa-solid fa-sliders" title="لا يوجد إعداد" body="أضف عدد الأيام ومستوى التنبيه." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {['غيابات متتالية', 'المستوى', 'الحالة', ''].map((c) => (
                      <th key={c} className="whitespace-nowrap px-4 py-3 text-right text-[11.5px] font-bold text-ink-dim">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-[#f4f1ea]">
                      <td className="font-latin px-4 py-3 text-[14px] font-bold">{row.consecutive_absences_count}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.alert_level} /></td>
                      <td className="px-4 py-3"><StatusBadge status={row.is_active ? 'active' : 'inactive'} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { setEditing(row); setForm({ consecutive_absences_count: String(row.consecutive_absences_count), alert_level: row.alert_level, is_active: row.is_active }); setModalOpen(true); }} className="text-[12px] font-semibold text-navy">تعديل</button>
                          <button type="button" onClick={() => setDeleteTarget(row)} className="text-[12px] font-semibold text-[#a34b4b]">حذف</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AdminContent>

      <FormModal open={modalOpen} onClose={() => !saveMutation.isPending && setModalOpen(false)} title={editing ? 'تعديل عتبة' : 'عتبة جديدة'} eyebrow="THRESHOLD" footer={
        <>
          <button type="button" onClick={() => setModalOpen(false)} className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft">إلغاء</button>
          <button type="button" disabled={saveMutation.isPending || !form.consecutive_absences_count} onClick={() => saveMutation.mutate()} className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy disabled:opacity-70">حفظ</button>
        </>
      }>
        <div className="space-y-3.5">
          <div>
            <label className={formLabelClass}>عدد الغيابات المتتالية</label>
            <input type="number" min={1} className={formFieldClass} value={form.consecutive_absences_count} onChange={(e) => setForm((f) => ({ ...f, consecutive_absences_count: e.target.value }))} />
          </div>
          <div>
            <label className={formLabelClass}>المستوى</label>
            <select className={formFieldClass} value={form.alert_level} onChange={(e) => setForm((f) => ({ ...f, alert_level: e.target.value as AbsenceAlertLevel }))}>
              <option value="notice">تنبيه</option>
              <option value="follow_up">متابعة</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
            نشط
          </label>
        </div>
      </FormModal>

      <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="حذف العتبة" body="هل تريد حذف هذه العتبة؟" confirmLabel="حذف" loading={deleteMutation.isPending} onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} />
    </>
  );
}
