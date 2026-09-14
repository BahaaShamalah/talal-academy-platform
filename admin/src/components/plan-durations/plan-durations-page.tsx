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
  type Paginated,
  type PlanDurationPeriod,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type FormState = { name: string; start_date: string; end_date: string };

const emptyForm: FormState = { name: '', start_date: '', end_date: '' };

export function PlanDurationsPage({ embedded }: { embedded?: boolean } = {}) {
  const canView = useAuthStore((s) => s.hasPermission('durations.view'));
  const canManage = useAuthStore((s) => s.hasPermission('durations.manage'));
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PlanDurationPeriod | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<PlanDurationPeriod | null>(null);

  const query = useQuery({
    queryKey: ['plan-durations'],
    queryFn: () =>
      apiClient<Paginated<PlanDurationPeriod>>(`/plan-durations${qs({ per_page: 100 })}`),
    enabled: canView,
  });

  const rows = query.data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
      };
      if (editing) {
        return apiClient(`/plan-durations/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return apiClient('/plan-durations', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast.success(editing ? 'تم تحديث المدة' : 'تم إضافة المدة');
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ['plan-durations'] });
      qc.invalidateQueries({ queryKey: ['plans'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/plan-durations/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم حذف المدة');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['plan-durations'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(row: PlanDurationPeriod) {
    setEditing(row);
    setForm({
      name: row.name,
      start_date: row.start_date,
      end_date: row.end_date,
    });
    setModalOpen(true);
  }

  if (!canView) {
    if (embedded) {
      return (
        <EmptyState
          icon="fa-solid fa-calendar-days"
          title="لا صلاحية"
          body="ليس لديك صلاحية عرض مدد الباقات."
        />
      );
    }
    return (
      <>
        <AdminHeader title="مدد الباقات" crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">
          ليس لديك صلاحية الوصول لهذه الصفحة.
        </AdminContent>
      </>
    );
  }

  const loading = query.isLoading;
  const isEmpty = !loading && rows.length === 0;

  const panel = (
    <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <p className="text-[13px] text-ink-dim">
              الحالة تُحسب تلقائيًا من التاريخ الحالي (نشطة / قادمة / منتهية).
            </p>
            {canManage ? (
              <button
                type="button"
                onClick={openCreate}
                className="flex items-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-[13.5px] font-extrabold text-navy"
              >
                <Icon name="fa-solid fa-plus" className="text-[12px]" /> إضافة مدة
              </button>
            ) : null}
          </div>

          {loading ? <TableSkeleton cols={5} /> : null}
          {isEmpty ? (
            <EmptyState
              icon="fa-solid fa-calendar-days"
              title="لا توجد مدد"
              body="أضف مددًا محددة بتواريخ من–إلى لاستخدامها في الباقات."
              primary={canManage ? { label: 'إضافة مدة', onClick: openCreate } : undefined}
            />
          ) : null}

          {!loading && !isEmpty ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {['الاسم', 'من', 'إلى', 'الحالة', ...(canManage ? [''] : [])].map((c, i) => (
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
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                      <td className="px-4 py-3 text-[13.5px] font-bold text-ink">{row.name}</td>
                      <td className="font-latin px-4 py-3 text-[13px] text-ink-soft" dir="ltr">
                        {row.start_date}
                      </td>
                      <td className="font-latin px-4 py-3 text-[13px] text-ink-soft" dir="ltr">
                        {row.end_date}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      {canManage ? (
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              aria-label="تعديل"
                              onClick={() => openEdit(row)}
                              className="h-[31px] w-[31px] rounded-[9px] border border-cream-line bg-white text-ink-soft"
                            >
                              <Icon name="fa-solid fa-pen" className="text-[11px]" />
                            </button>
                            <button
                              type="button"
                              aria-label="حذف"
                              onClick={() => setDeleteTarget(row)}
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
  );

  return (
    <>
      {embedded ? panel : (
        <>
          <AdminHeader title="مدد الباقات" crumb="الإعدادات ← مدد الباقات" />
          <AdminContent>{panel}</AdminContent>
        </>
      )}

      <FormModal
        open={modalOpen}
        onClose={() => {
          if (!saveMutation.isPending) {
            setModalOpen(false);
            setEditing(null);
          }
        }}
        title={editing ? 'تعديل مدة' : 'إضافة مدة'}
        eyebrow="DURATION"
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
              disabled={saveMutation.isPending}
              onClick={() => {
                if (!form.name.trim() || !form.start_date || !form.end_date) {
                  toast.error('أكمل الحقول المطلوبة');
                  return;
                }
                if (form.end_date <= form.start_date) {
                  toast.error('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
                  return;
                }
                saveMutation.mutate();
              }}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy"
            >
              {saveMutation.isPending ? 'جاري الحفظ…' : 'حفظ'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={formLabelClass}>الاسم</label>
            <input
              className={formFieldClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثال: الفصل الدراسي الأول"
            />
          </div>
          <div>
            <label className={formLabelClass}>من تاريخ</label>
            <input
              className={`${formFieldClass} font-latin`}
              dir="ltr"
              type="date"
              value={form.start_date}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
            />
          </div>
          <div>
            <label className={formLabelClass}>إلى تاريخ</label>
            <input
              className={`${formFieldClass} font-latin`}
              dir="ltr"
              type="date"
              value={form.end_date}
              onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
            />
          </div>
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="حذف المدة؟"
        body={`سيتم حذف «${deleteTarget?.name ?? ''}». إذا كانت مرتبطة بباقات فسيرفض الخادم الحذف.`}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  );
}
