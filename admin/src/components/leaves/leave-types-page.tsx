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
import { apiClient, qs, type LeaveType, type Paginated } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type FormState = {
  name: string;
  default_annual_balance: string;
};

const emptyForm = (): FormState => ({ name: '', default_annual_balance: '30' });

export function LeaveTypesPage() {
  const canManage = useAuthStore((s) => s.hasPermission('leaves.manage'));
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<LeaveType | null>(null);

  const query = useQuery({
    queryKey: ['leave-types'],
    queryFn: () => apiClient<Paginated<LeaveType>>(`/leave-types${qs({ per_page: 100 })}`),
    enabled: canManage,
  });

  const rows = query.data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        default_annual_balance: Number(form.default_annual_balance),
      };
      if (editing) {
        return apiClient(`/leave-types/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return apiClient('/leave-types', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast.success(editing ? 'تم التحديث' : 'تمت الإضافة');
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm());
      qc.invalidateQueries({ queryKey: ['leave-types'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/leave-types/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم الحذف');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['leave-types'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!canManage) {
    return (
      <>
        <AdminHeader title="أنواع الإجازات" crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">صلاحية إدارية فقط.</AdminContent>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="أنواع الإجازات" crumb="الموارد البشرية ← أنواع الإجازات" />
      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex justify-end border-b border-[#f0ece1] p-3.5">
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(emptyForm());
                setModalOpen(true);
              }}
              className="flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-[13.5px] font-extrabold text-navy"
            >
              <Icon name="fa-solid fa-plus" className="text-[12px]" /> إضافة نوع
            </button>
          </div>
          {query.isLoading ? <TableSkeleton cols={3} /> : null}
          {!query.isLoading && rows.length === 0 ? (
            <EmptyState icon="fa-solid fa-list" title="لا أنواع" body="أضف أنواع الإجازات." />
          ) : null}
          {!query.isLoading && rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {['الاسم', 'الرصيد السنوي الافتراضي', ''].map((c) => (
                      <th key={c} className="px-4 py-3 text-right text-[11.5px] font-bold text-ink-dim">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-[#f4f1ea]">
                      <td className="px-4 py-3 text-[13.5px] font-bold">{row.name}</td>
                      <td className="font-latin px-4 py-3 text-[13px]">{row.default_annual_balance}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(row);
                              setForm({
                                name: row.name,
                                default_annual_balance: String(row.default_annual_balance),
                              });
                              setModalOpen(true);
                            }}
                            className="h-[31px] w-[31px] rounded-[9px] border border-cream-line bg-white text-ink-soft"
                          >
                            <Icon name="fa-solid fa-pen" className="text-[11px]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(row)}
                            className="h-[31px] w-[31px] rounded-[9px] border border-[#f2dede] bg-white text-[#a34b4b]"
                          >
                            <Icon name="fa-solid fa-trash" className="text-[11px]" />
                          </button>
                        </div>
                      </td>
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
        title={editing ? 'تعديل نوع إجازة' : 'إضافة نوع إجازة'}
        eyebrow="LEAVE TYPE"
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
                form.default_annual_balance === '' ||
                Number.isNaN(Number(form.default_annual_balance))
              }
              onClick={() => saveMutation.mutate()}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy disabled:opacity-70"
            >
              حفظ
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className={formLabelClass}>الاسم</label>
            <input
              className={formFieldClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className={formLabelClass}>الرصيد السنوي الافتراضي (أيام)</label>
            <input
              type="number"
              min={0}
              className={`${formFieldClass} font-latin`}
              value={form.default_annual_balance}
              onChange={(e) => setForm((f) => ({ ...f, default_annual_balance: e.target.value }))}
            />
          </div>
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleteMutation.isPending) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        title="حذف نوع الإجازة؟"
        body={`سيتم حذف «${deleteTarget?.name ?? ''}».`}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
