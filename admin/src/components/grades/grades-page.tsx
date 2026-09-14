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
  qs,
  type EducationalStage,
  type Grade,
  type Paginated,
  type Subject,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type FormState = {
  name: string;
  educational_stage_id: string;
  order: string;
};

const emptyForm: FormState = { name: '', educational_stage_id: '', order: '0' };

export function GradesPage() {
  const canManage = useAuthStore((s) => s.hasPermission('grades.manage'));
  const qc = useQueryClient();

  const [stageId, setStageId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Grade | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [linkedSubjectIds, setLinkedSubjectIds] = useState<number[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Grade | null>(null);

  const stagesQuery = useQuery({
    queryKey: ['educational-stages'],
    queryFn: () =>
      apiClient<Paginated<EducationalStage>>(`/educational-stages${qs({ per_page: 100 })}`),
  });

  const subjectsQuery = useQuery({
    queryKey: ['subjects'],
    queryFn: () => apiClient<Paginated<Subject>>(`/subjects${qs({ per_page: 100 })}`),
  });

  const gradesQuery = useQuery({
    queryKey: ['grades', stageId],
    queryFn: () =>
      apiClient<Paginated<Grade>>(
        `/grades${qs({
          include: 'educationalStage,subjects',
          per_page: 100,
          'filter[educational_stage_id]': stageId || undefined,
        })}`,
      ),
  });

  const stages = stagesQuery.data?.data ?? [];
  const subjects = subjectsQuery.data?.data ?? [];
  const grades = gradesQuery.data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        educational_stage_id: Number(form.educational_stage_id),
        order: Number(form.order) || 0,
      };

      let gradeId: number;
      if (editing) {
        await apiClient(`/grades/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        gradeId = editing.id;
      } else {
        const created = await apiClient<{ data: Grade }>('/grades', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        gradeId = created.data?.id ?? (created as unknown as Grade).id;
      }

      const currentIds = new Set(
        editing
          ? (editing.subjects ?? []).map((s) => s.id)
          : [],
      );
      const nextIds = new Set(linkedSubjectIds);

      const toAttach = [...nextIds].filter((id) => !currentIds.has(id));
      const toDetach = [...currentIds].filter((id) => !nextIds.has(id));

      await Promise.all([
        ...toAttach.map((subjectId) =>
          apiClient(`/grades/${gradeId}/subjects/${subjectId}`, { method: 'POST' }),
        ),
        ...toDetach.map((subjectId) =>
          apiClient(`/grades/${gradeId}/subjects/${subjectId}`, { method: 'DELETE' }),
        ),
      ]);
    },
    onSuccess: () => {
      toast.success(editing ? 'تم تحديث الصف بنجاح' : 'تم إضافة الصف بنجاح');
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setLinkedSubjectIds([]);
      qc.invalidateQueries({ queryKey: ['grades'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/grades/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم حذف الصف');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['grades'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, educational_stage_id: stageId });
    setLinkedSubjectIds([]);
    setModalOpen(true);
  }

  function openEdit(grade: Grade) {
    setEditing(grade);
    setForm({
      name: grade.name,
      educational_stage_id: String(grade.educational_stage_id),
      order: String(grade.order ?? 0),
    });
    setLinkedSubjectIds((grade.subjects ?? []).map((s) => s.id));
    setModalOpen(true);
  }

  function toggleSubject(id: number) {
    setLinkedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const selectCls =
    'rounded-[11px] border border-cream-line bg-cream-soft px-2.5 py-2 text-[12.5px] text-ink-soft';
  const loading = gradesQuery.isLoading;
  const isEmpty = !loading && grades.length === 0;

  return (
    <>
      <AdminHeader title="الصفوف" crumb="الهيكل الأكاديمي ← الصفوف" />

      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <select className={selectCls} value={stageId} onChange={(e) => setStageId(e.target.value)}>
                <option value="">كل المراحل</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
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
                <Icon name="fa-solid fa-plus" className="text-[12px]" /> إضافة صف
              </button>
            ) : null}
          </div>

          {loading ? <TableSkeleton cols={4} /> : null}

          {isEmpty ? (
            <EmptyState
              icon="fa-solid fa-school"
              title="لا توجد صفوف"
              body="لم نجد صفوفًا مطابقة. أضف صفًا جديدًا أو غيّر فلتر المرحلة."
              primary={canManage ? { label: 'إضافة صف', onClick: openCreate } : undefined}
              secondary={{ label: 'إعادة ضبط الفلتر', onClick: () => setStageId('') }}
            />
          ) : null}

          {!loading && !isEmpty ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {['اسم الصف', 'المرحلة', 'عدد المواد', ...(canManage ? [''] : [])].map((c, i) => (
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
                  {grades.map((grade) => (
                    <tr key={grade.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                      <td className="px-4 py-3 text-[13.5px] font-bold text-ink">{grade.name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {grade.educational_stage?.name ?? '—'}
                      </td>
                      <td className="font-latin px-4 py-3 text-[13px] text-ink-soft">
                        {grade.subjects_count ?? grade.subjects?.length ?? 0}
                      </td>
                      {canManage ? (
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              aria-label="تعديل"
                              onClick={() => openEdit(grade)}
                              className="h-[31px] w-[31px] rounded-[9px] border border-cream-line bg-white text-ink-soft"
                            >
                              <Icon name="fa-solid fa-pen" className="text-[11px]" />
                            </button>
                            <button
                              type="button"
                              aria-label="حذف"
                              onClick={() => setDeleteTarget(grade)}
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
        title={editing ? 'تعديل صف' : 'إضافة صف'}
        eyebrow="GRADE"
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
                if (!form.name.trim() || !form.educational_stage_id) {
                  toast.error('أكمل الحقول المطلوبة');
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
            <label className={formLabelClass}>اسم الصف</label>
            <input
              className={formFieldClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثال: الصف السابع"
            />
          </div>
          <div>
            <label className={formLabelClass}>المرحلة</label>
            <select
              className={formFieldClass}
              value={form.educational_stage_id}
              onChange={(e) => setForm((f) => ({ ...f, educational_stage_id: e.target.value }))}
            >
              <option value="">اختر المرحلة</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
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
          <div className="sm:col-span-2">
            <div className={formLabelClass}>المواد المرتبطة</div>
            <div className="max-h-[220px] space-y-1.5 overflow-y-auto rounded-xl border border-cream-line2 bg-white p-3">
              {subjects.length === 0 ? (
                <p className="text-[13px] text-ink-dim">لا توجد مواد بعد. أضف موادًا من صفحة المواد أولًا.</p>
              ) : (
                subjects.map((subject) => {
                  const checked = linkedSubjectIds.includes(subject.id);
                  return (
                    <label
                      key={subject.id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-cream-soft"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-gold"
                        checked={checked}
                        disabled={!canManage}
                        onChange={() => toggleSubject(subject.id)}
                      />
                      <span className="text-[13.5px] text-ink">{subject.name}</span>
                    </label>
                  );
                })
              )}
            </div>
            <p className="mt-1.5 text-[11.5px] text-ink-faint">
              تُحفظ الروابط عند الضغط على حفظ (إضافة أو إزالة عبر الـ API).
            </p>
          </div>
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="حذف الصف؟"
        body={`سيتم حذف «${deleteTarget?.name ?? ''}». إذا كان مرتبطًا بشعب أو باقات فسيرفض الخادم الحذف.`}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  );
}
