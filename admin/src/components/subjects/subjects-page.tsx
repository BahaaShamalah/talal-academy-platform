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
import { apiClient, qs, type Paginated, type Subject } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type FormState = { name: string; description: string };

const emptyForm: FormState = { name: '', description: '' };

export function SubjectsPage() {
  const canManage = useAuthStore((s) => s.hasPermission('subjects.manage'));
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);

  const subjectsQuery = useQuery({
    queryKey: ['subjects'],
    queryFn: () => apiClient<Paginated<Subject>>(`/subjects${qs({ per_page: 100 })}`),
  });

  const subjects = subjectsQuery.data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
      };
      if (editing) {
        return apiClient(`/subjects/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return apiClient('/subjects', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast.success(editing ? 'تم تحديث المادة بنجاح' : 'تم إضافة المادة بنجاح');
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ['subjects'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/subjects/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم حذف المادة');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['subjects'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(subject: Subject) {
    setEditing(subject);
    setForm({
      name: subject.name,
      description: subject.description ?? '',
    });
    setModalOpen(true);
  }

  const loading = subjectsQuery.isLoading;
  const isEmpty = !loading && subjects.length === 0;

  return (
    <>
      <AdminHeader title="المواد" crumb="الهيكل الأكاديمي ← المواد" />

      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <div className="text-[13px] text-ink-dim">قائمة المواد الدراسية المرتبطة بالصفوف</div>
            {canManage ? (
              <button
                type="button"
                onClick={openCreate}
                className="flex items-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-[13.5px] font-extrabold text-navy shadow-[0_12px_26px_-14px_rgba(200,162,74,.8)] transition-transform hover:-translate-y-px"
              >
                <Icon name="fa-solid fa-plus" className="text-[12px]" /> إضافة مادة
              </button>
            ) : null}
          </div>

          {loading ? <TableSkeleton cols={4} /> : null}

          {isEmpty ? (
            <EmptyState
              icon="fa-solid fa-book"
              title="لا توجد مواد"
              body="ابدأ بإضافة المواد الدراسية التي ستُربط لاحقًا بالصفوف والشعب."
              primary={canManage ? { label: 'إضافة مادة', onClick: openCreate } : undefined}
            />
          ) : null}

          {!loading && !isEmpty ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {['اسم المادة', 'الوصف', 'عدد الصفوف', ...(canManage ? [''] : [])].map((c, i) => (
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
                  {subjects.map((subject) => (
                    <tr key={subject.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                      <td className="px-4 py-3 text-[13.5px] font-bold text-ink">{subject.name}</td>
                      <td className="max-w-[360px] px-4 py-3 text-[13px] text-ink-soft">
                        <span className="line-clamp-2">{subject.description || '—'}</span>
                      </td>
                      <td className="font-latin px-4 py-3 text-[13px] text-ink-soft">
                        {subject.grades_count ?? 0}
                      </td>
                      {canManage ? (
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              aria-label="تعديل"
                              onClick={() => openEdit(subject)}
                              className="h-[31px] w-[31px] rounded-[9px] border border-cream-line bg-white text-ink-soft"
                            >
                              <Icon name="fa-solid fa-pen" className="text-[11px]" />
                            </button>
                            <button
                              type="button"
                              aria-label="حذف"
                              onClick={() => setDeleteTarget(subject)}
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
        title={editing ? 'تعديل مادة' : 'إضافة مادة'}
        eyebrow="SUBJECT"
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
                  toast.error('اسم المادة مطلوب');
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
        <div className="grid grid-cols-1 gap-3.5">
          <div>
            <label className={formLabelClass}>اسم المادة</label>
            <input
              className={formFieldClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثال: الرياضيات"
            />
          </div>
          <div>
            <label className={formLabelClass}>
              الوصف <span className="font-normal text-ink-faint">(اختياري)</span>
            </label>
            <textarea
              rows={3}
              className={`${formFieldClass} resize-y leading-[1.7]`}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="حذف المادة؟"
        body={`سيتم حذف «${deleteTarget?.name ?? ''}». إذا كانت مرتبطة بدورات فسيرفض الخادم الحذف.`}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  );
}
