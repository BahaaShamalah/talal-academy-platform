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
  type FamilyDiscountRule,
  type Paginated,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type FormState = {
  min_children_count: string;
  discount_percentage: string;
  is_active: boolean;
};

const emptyForm = (): FormState => ({
  min_children_count: '2',
  discount_percentage: '',
  is_active: true,
});

export function FamilyDiscountRulesPage() {
  const canView = useAuthStore((s) => s.hasPermission('family-discounts.view'));
  const canManage = useAuthStore((s) => s.hasPermission('family-discounts.manage'));
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FamilyDiscountRule | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<FamilyDiscountRule | null>(null);

  const query = useQuery({
    queryKey: ['family-discount-rules'],
    queryFn: () =>
      apiClient<Paginated<FamilyDiscountRule>>(
        `/family-discount-rules${qs({ per_page: 100 })}`,
      ),
    enabled: canView,
  });

  const rows = query.data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        min_children_count: Number(form.min_children_count),
        discount_percentage: Number(form.discount_percentage),
        is_active: form.is_active,
      };
      if (editing) {
        return apiClient(`/family-discount-rules/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return apiClient('/family-discount-rules', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success(editing ? 'تم التحديث' : 'تمت الإضافة');
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm());
      qc.invalidateQueries({ queryKey: ['family-discount-rules'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (row: FamilyDiscountRule) =>
      apiClient(`/family-discount-rules/${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !row.is_active }),
      }),
    onSuccess: () => {
      toast.success('تم تحديث الحالة');
      qc.invalidateQueries({ queryKey: ['family-discount-rules'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/family-discount-rules/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم الحذف');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['family-discount-rules'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!canView) {
    return (
      <>
        <AdminHeader title="الخصم العائلي" crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">ليس لديك صلاحية الوصول.</AdminContent>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="الخصم العائلي" crumb="المالية ← الخصم العائلي" />
      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <p className="text-[13px] text-ink-dim">قواعد الخصم حسب عدد الأبناء المسجّلين</p>
            {canManage ? (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setForm(emptyForm());
                  setModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-[13px] font-extrabold text-navy"
              >
                <Icon name="fa-solid fa-plus" className="text-[11px]" />
                قاعدة جديدة
              </button>
            ) : null}
          </div>

          {query.isLoading ? (
            <TableSkeleton rows={3} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon="fa-solid fa-people-roof"
              title="لا قواعد"
              body="أضف قاعدة خصم عائلية (مثلاً من ابنين فأكثر)."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {['الحد الأدنى للأبناء', 'نسبة الخصم', 'الحالة', ''].map((c) => (
                      <th
                        key={c || 'actions'}
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
                      <td className="font-latin px-4 py-3 text-[14px] font-bold text-navy-800">
                        {row.min_children_count}
                      </td>
                      <td className="font-latin px-4 py-3 text-[14px] font-bold text-navy-800">
                        {Number(row.discount_percentage)}%
                      </td>
                      <td className="px-4 py-3">
                        {canManage ? (
                          <button
                            type="button"
                            disabled={toggleMutation.isPending}
                            onClick={() => toggleMutation.mutate(row)}
                            className="inline-flex items-center gap-2"
                            title={row.is_active ? 'إيقاف' : 'تفعيل'}
                          >
                            <span
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                row.is_active ? 'bg-[#2e7d4f]' : 'bg-[#cfc8bb]'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                                  row.is_active ? '-translate-x-4' : '-translate-x-0.5'
                                }`}
                              />
                            </span>
                            <StatusBadge status={row.is_active ? 'active' : 'inactive'} />
                          </button>
                        ) : (
                          <StatusBadge status={row.is_active ? 'active' : 'inactive'} />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {canManage ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditing(row);
                                setForm({
                                  min_children_count: String(row.min_children_count),
                                  discount_percentage: String(Number(row.discount_percentage)),
                                  is_active: row.is_active,
                                });
                                setModalOpen(true);
                              }}
                              className="text-[12px] font-semibold text-navy"
                            >
                              تعديل
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(row)}
                              className="text-[12px] font-semibold text-[#a34b4b]"
                            >
                              حذف
                            </button>
                          </div>
                        ) : null}
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
        title={editing ? 'تعديل قاعدة' : 'قاعدة جديدة'}
        eyebrow="FAMILY DISCOUNT"
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
                !form.min_children_count ||
                !form.discount_percentage
              }
              onClick={() => saveMutation.mutate()}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy disabled:opacity-70"
            >
              حفظ
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div>
            <label className={formLabelClass}>الحد الأدنى لعدد الأبناء</label>
            <input
              type="number"
              min={2}
              max={20}
              className={formFieldClass}
              value={form.min_children_count}
              onChange={(e) => setForm((f) => ({ ...f, min_children_count: e.target.value }))}
            />
          </div>
          <div>
            <label className={formLabelClass}>نسبة الخصم (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              className={formFieldClass}
              value={form.discount_percentage}
              onChange={(e) => setForm((f) => ({ ...f, discount_percentage: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-[13px]">
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
        title="حذف القاعدة"
        body="هل تريد حذف قاعدة الخصم العائلي؟"
        confirmLabel="حذف"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  );
}
