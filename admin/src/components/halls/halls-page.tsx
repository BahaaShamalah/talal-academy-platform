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
import { apiClient, qs, type Branch, type Hall, type Paginated } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type FormState = { name: string; branch_id: string; capacity: string; order: string };

const emptyForm: FormState = { name: '', branch_id: '', capacity: '20', order: '0' };

export function HallsPage() {
  const canManage = useAuthStore((s) => s.hasPermission('halls.manage'));
  const qc = useQueryClient();

  const [branchId, setBranchId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Hall | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Hall | null>(null);

  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: () => apiClient<Paginated<Branch>>(`/branches${qs({ per_page: 100 })}`),
  });

  const hallsQuery = useQuery({
    queryKey: ['halls', branchId],
    queryFn: () =>
      apiClient<Paginated<Hall>>(
        `/halls${qs({
          per_page: 100,
          'filter[branch_id]': branchId || undefined,
        })}`,
      ),
  });

  const branches = branchesQuery.data?.data ?? [];
  const halls = hallsQuery.data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        branch_id: Number(form.branch_id),
        capacity: Number(form.capacity),
        order: Number(form.order) || 0,
      };
      if (editing) {
        return apiClient(`/halls/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return apiClient('/halls', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast.success(editing ? 'تم تحديث القاعة بنجاح' : 'تم إضافة القاعة بنجاح');
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ['halls'] });
      qc.invalidateQueries({ queryKey: ['branches'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/halls/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم حذف القاعة');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['halls'] });
      qc.invalidateQueries({ queryKey: ['branches'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreate() {
    setEditing(null);
    const nextOrder =
      halls.length > 0
        ? Math.max(...halls.map((h) => h.order ?? 0)) + 1
        : 0;
    setForm({ ...emptyForm, branch_id: branchId, order: String(nextOrder) });
    setModalOpen(true);
  }

  function openEdit(hall: Hall) {
    setEditing(hall);
    setForm({
      name: hall.name,
      branch_id: String(hall.branch_id),
      capacity: String(hall.capacity),
      order: String(hall.order ?? 0),
    });
    setModalOpen(true);
  }

  const selectCls =
    'rounded-[11px] border border-cream-line bg-cream-soft px-2.5 py-2 text-[12.5px] text-ink-soft';
  const loading = hallsQuery.isLoading;
  const isEmpty = !loading && halls.length === 0;

  return (
    <>
      <AdminHeader title="القاعات" crumb="الفروع ← القاعات" />

      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <select className={selectCls} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                <option value="">كل الفروع</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {canManage ? (
              <button
                type="button"
                onClick={openCreate}
                className="flex items-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-[13.5px] font-extrabold text-navy shadow-[0_12px_26px_-14px_rgba(200,162,74,.8)] transition-transform hover:-translate-y-px"
              >
                <Icon name="fa-solid fa-plus" className="text-[12px]" /> إضافة قاعة
              </button>
            ) : null}
          </div>

          {loading ? <TableSkeleton cols={5} /> : null}

          {isEmpty ? (
            <EmptyState
              icon="fa-solid fa-door-open"
              title="لا توجد قاعات"
              body="لم نجد قاعات مطابقة للفلتر. أضف قاعة جديدة أو اختر فرعًا آخر."
              primary={canManage ? { label: 'إضافة قاعة', onClick: openCreate } : undefined}
              secondary={{
                label: 'إعادة ضبط الفلتر',
                onClick: () => setBranchId(''),
              }}
            />
          ) : null}

          {!loading && !isEmpty ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {['الترتيب', 'اسم القاعة', 'الفرع', 'السعة', ...(canManage ? [''] : [])].map((c, i) => (
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
                  {halls.map((hall) => (
                    <tr key={hall.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                      <td className="font-latin px-4 py-3 text-[13px] text-ink-dim">{hall.order ?? 0}</td>
                      <td className="px-4 py-3 text-[13.5px] font-bold text-ink">{hall.name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {hall.branch?.name ?? '—'}
                      </td>
                      <td className="font-latin px-4 py-3 text-[13px] text-ink-soft">{hall.capacity}</td>
                      {canManage ? (
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              aria-label="تعديل"
                              onClick={() => openEdit(hall)}
                              className="h-[31px] w-[31px] rounded-[9px] border border-cream-line bg-white text-ink-soft"
                            >
                              <Icon name="fa-solid fa-pen" className="text-[11px]" />
                            </button>
                            <button
                              type="button"
                              aria-label="حذف"
                              onClick={() => setDeleteTarget(hall)}
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
          if (!saveMutation.isPending) {
            setModalOpen(false);
            setEditing(null);
          }
        }}
        title={editing ? 'تعديل قاعة' : 'إضافة قاعة'}
        eyebrow="HALL"
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
                if (!form.name.trim() || !form.branch_id) {
                  toast.error('أكمل الحقول المطلوبة');
                  return;
                }
                if (Number(form.capacity) <= 0) {
                  toast.error('السعة يجب أن تكون أكبر من صفر');
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
            <label className={formLabelClass}>اسم القاعة</label>
            <input
              className={formFieldClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثال: قاعة أ"
            />
          </div>
          <div>
            <label className={formLabelClass}>الفرع</label>
            <select
              className={formFieldClass}
              value={form.branch_id}
              onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value }))}
            >
              <option value="">اختر الفرع</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={formLabelClass}>السعة</label>
            <input
              className={`${formFieldClass} font-latin text-left`}
              dir="ltr"
              type="number"
              min="1"
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
            />
          </div>
          <div>
            <label className={formLabelClass}>الترتيب</label>
            <input
              className={`${formFieldClass} font-latin text-left`}
              dir="ltr"
              type="number"
              min="0"
              value={form.order}
              onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
            />
          </div>
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="حذف القاعة؟"
        body={`سيتم حذف «${deleteTarget?.name ?? ''}». إذا كانت مرتبطة بشعب فسيرفض الخادم الحذف.`}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  );
}
