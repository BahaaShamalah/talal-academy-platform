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
import { apiClient, qs, type EducationalStage, type Paginated } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type FormState = { name: string; order: string };

const emptyForm: FormState = { name: '', order: '0' };

export function StagesPage() {
  const canManage = useAuthStore((s) => s.hasPermission('stages.manage'));
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EducationalStage | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<EducationalStage | null>(null);

  const stagesQuery = useQuery({
    queryKey: ['educational-stages'],
    queryFn: () =>
      apiClient<Paginated<EducationalStage>>(`/educational-stages${qs({ per_page: 100 })}`),
  });

  const stages = stagesQuery.data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        order: Number(form.order) || 0,
      };
      if (editing) {
        return apiClient(`/educational-stages/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return apiClient('/educational-stages', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success(editing ? 'تم تحديث المرحلة بنجاح' : 'تم إضافة المرحلة بنجاح');
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ['educational-stages'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/educational-stages/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم حذف المرحلة');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['educational-stages'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(stage: EducationalStage) {
    setEditing(stage);
    setForm({ name: stage.name, order: String(stage.order ?? 0) });
    setModalOpen(true);
  }

  const loading = stagesQuery.isLoading;
  const isEmpty = !loading && stages.length === 0;

  return (
    <>
      <AdminHeader title="المراحل" crumb="الهيكل الأكاديمي ← المراحل" />

      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <div className="text-[13px] text-ink-dim">المراحل التعليمية (ابتدائي / متوسط / ثانوي)</div>
            {canManage ? (
              <button
                type="button"
                onClick={openCreate}
                className="flex items-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-[13.5px] font-extrabold text-navy shadow-[0_12px_26px_-14px_rgba(200,162,74,.8)] transition-transform hover:-translate-y-px"
              >
                <Icon name="fa-solid fa-plus" className="text-[12px]" /> إضافة مرحلة
              </button>
            ) : null}
          </div>

          {loading ? <TableSkeleton cols={4} /> : null}

          {isEmpty ? (
            <EmptyState
              icon="fa-solid fa-stairs"
              title="لا توجد مراحل"
              body="أضف المراحل التعليمية أولًا ثم أنشئ الصفوف التابعة لها."
              primary={canManage ? { label: 'إضافة مرحلة', onClick: openCreate } : undefined}
            />
          ) : null}

          {!loading && !isEmpty ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {['اسم المرحلة', 'الترتيب', 'عدد الصفوف', ...(canManage ? [''] : [])].map(
                      (c, i) => (
                        <th
                          key={`${c}-${i}`}
                          className="whitespace-nowrap px-4 py-3 text-right text-[11.5px] font-bold text-ink-dim"
                        >
                          {c}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {stages.map((stage) => (
                    <tr key={stage.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                      <td className="px-4 py-3 text-[13.5px] font-bold text-ink">{stage.name}</td>
                      <td className="font-latin px-4 py-3 text-[13px] text-ink-soft">{stage.order}</td>
                      <td className="font-latin px-4 py-3 text-[13px] text-ink-soft">
                        {stage.grades_count ?? 0}
                      </td>
                      {canManage ? (
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              aria-label="تعديل"
                              onClick={() => openEdit(stage)}
                              className="h-[31px] w-[31px] rounded-[9px] border border-cream-line bg-white text-ink-soft"
                            >
                              <Icon name="fa-solid fa-pen" className="text-[11px]" />
                            </button>
                            <button
                              type="button"
                              aria-label="حذف"
                              onClick={() => setDeleteTarget(stage)}
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
        title={editing ? 'تعديل مرحلة' : 'إضافة مرحلة'}
        eyebrow="STAGE"
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
                if (!form.name.trim()) {
                  toast.error('اسم المرحلة مطلوب');
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
            <label className={formLabelClass}>اسم المرحلة</label>
            <input
              className={formFieldClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثال: متوسط"
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
        title="حذف المرحلة؟"
        body={`سيتم حذف «${deleteTarget?.name ?? ''}». إذا كانت مرتبطة بصفوف فسيرفض الخادم الحذف.`}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  );
}
