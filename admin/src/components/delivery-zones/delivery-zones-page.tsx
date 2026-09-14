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
import {
  apiClient,
  formatKwd,
  qs,
  type DeliveryZone,
  type Paginated,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type FormState = {
  name: string;
  fee: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  name: '',
  fee: '',
  is_active: true,
};

export function DeliveryZonesPage() {
  const canView = useAuthStore((s) => s.hasPermission('delivery-zones.view'));
  const canManage = useAuthStore((s) => s.hasPermission('delivery-zones.manage'));
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryZone | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<DeliveryZone | null>(null);

  const zonesQuery = useQuery({
    queryKey: ['delivery-zones'],
    queryFn: () =>
      apiClient<Paginated<DeliveryZone>>(`/delivery-zones${qs({ per_page: 100 })}`),
    enabled: canView,
  });

  const zones = zonesQuery.data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        fee: Number(form.fee),
        is_active: form.is_active,
      };
      if (editing) {
        return apiClient(`/delivery-zones/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return apiClient('/delivery-zones', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast.success(editing ? 'تم تحديث المنطقة' : 'تم إضافة المنطقة');
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ['delivery-zones'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (zone: DeliveryZone) =>
      apiClient(`/delivery-zones/${zone.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !zone.is_active }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery-zones'] }),
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/delivery-zones/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم حذف المنطقة');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['delivery-zones'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(zone: DeliveryZone) {
    setEditing(zone);
    setForm({
      name: zone.name,
      fee: String(zone.fee),
      is_active: zone.is_active,
    });
    setModalOpen(true);
  }

  if (!canView) {
    return (
      <>
        <AdminHeader title="مناطق التوصيل" crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">ليس لديك صلاحية الوصول لهذه الصفحة.</AdminContent>
      </>
    );
  }

  const loading = zonesQuery.isLoading;
  const isEmpty = !loading && zones.length === 0;

  return (
    <>
      <AdminHeader title="مناطق التوصيل" crumb="المتجر ← مناطق التوصيل" />

      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <div className="text-[13px] text-ink-dim">{zones.length} منطقة</div>
            {canManage ? (
              <button
                type="button"
                onClick={openCreate}
                className="flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-[13.5px] font-extrabold text-navy"
              >
                <Icon name="fa-solid fa-plus" className="text-[12px]" /> إضافة منطقة
              </button>
            ) : null}
          </div>

          {loading ? <TableSkeleton cols={4} /> : null}
          {isEmpty ? (
            <EmptyState
              icon="fa-solid fa-truck"
              title="لا توجد مناطق"
              body="أضف مناطق التوصيل ورسومها."
              primary={canManage ? { label: 'إضافة منطقة', onClick: openCreate } : undefined}
            />
          ) : null}

          {!loading && !isEmpty ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {['الاسم', 'الرسوم', 'الحالة', ...(canManage ? [''] : [])].map((c, i) => (
                      <th
                        key={`${c}-${i}`}
                        className="whitespace-nowrap px-4 py-3 text-right text-[11.5px] font-bold text-ink-dim"
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {zones.map((zone) => (
                    <tr key={zone.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                      <td className="px-4 py-3 text-[13.5px] font-bold text-ink">{zone.name}</td>
                      <td className="font-latin whitespace-nowrap px-4 py-3 text-[13px] font-bold text-navy">
                        {formatKwd(zone.fee)}
                      </td>
                      <td className="px-4 py-3">
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => toggleActiveMutation.mutate(zone)}
                            className={`relative h-6 w-11 rounded-full transition-colors ${
                              zone.is_active ? 'bg-[#2e7d4f]' : 'bg-[#d5cfc3]'
                            }`}
                            aria-label="تبديل الحالة"
                          >
                            <span
                              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                                zone.is_active ? 'left-0.5' : 'left-[22px]'
                              }`}
                            />
                          </button>
                        ) : zone.is_active ? (
                          <span className="text-[12.5px] font-bold text-[#2e7d4f]">نشط</span>
                        ) : (
                          <span className="text-[12.5px] font-bold text-ink-dim">متوقف</span>
                        )}
                      </td>
                      {canManage ? (
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              aria-label="تعديل"
                              onClick={() => openEdit(zone)}
                              className="h-[31px] w-[31px] rounded-[9px] border border-cream-line bg-white text-ink-soft"
                            >
                              <Icon name="fa-solid fa-pen" className="text-[11px]" />
                            </button>
                            <button
                              type="button"
                              aria-label="حذف"
                              onClick={() => setDeleteTarget(zone)}
                              className="h-[31px] w-[31px] rounded-[9px] border border-[#f2dede] bg-white text-[#a34b4b]"
                            >
                              <Icon name="fa-solid fa-trash" className="text-[11px]" />
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </AdminContent>

      <FormModal
        open={modalOpen}
        onClose={() => {
          if (!saveMutation.isPending) setModalOpen(false);
        }}
        title={editing ? 'تعديل منطقة' : 'إضافة منطقة'}
        eyebrow="DELIVERY ZONE"
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
              disabled={saveMutation.isPending || !form.name.trim() || !form.fee}
              onClick={() => saveMutation.mutate()}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy disabled:opacity-70"
            >
              {saveMutation.isPending ? 'جاري الحفظ…' : 'حفظ'}
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div>
            <label className={formLabelClass}>الاسم</label>
            <input
              className={formFieldClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className={formLabelClass}>الرسوم (د.ك)</label>
            <input
              type="number"
              step="0.001"
              min={0}
              className={`${formFieldClass} font-latin`}
              value={form.fee}
              onChange={(e) => setForm((f) => ({ ...f, fee: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-[13.5px] text-ink">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            نشط
          </label>
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="حذف المنطقة؟"
        body={`سيتم حذف «${deleteTarget?.name ?? ''}».`}
        confirmLabel="حذف"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  );
}
