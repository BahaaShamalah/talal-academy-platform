'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { MediaPicker } from '@/components/media/media-picker';
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
  type AcademicPeriod,
  type EducationalMaterial,
  type EducationalMaterialScope,
  type Grade,
  type Paginated,
  type Student,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type MaterialForm = {
  title: string;
  description: string;
  scope: EducationalMaterialScope;
  grade_id: string;
  subject_id: string;
  student_id: string;
};

const emptyForm = (): MaterialForm => ({
  title: '',
  description: '',
  scope: 'general',
  grade_id: '',
  subject_id: '',
  student_id: '',
});

export function EducationalMaterialsPage() {
  const canView = useAuthStore((s) => s.hasPermission('materials.view'));
  const canManage = useAuthStore((s) => s.hasPermission('materials.manage'));
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<MaterialForm>(emptyForm);
  const [mediaId, setMediaId] = useState<number | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EducationalMaterial | null>(null);

  const materialsQuery = useQuery({
    queryKey: ['educational-materials'],
    queryFn: () =>
      apiClient<Paginated<EducationalMaterial>>(
        `/educational-materials${qs({
          include: 'media,grade,subject,student',
          per_page: 100,
        })}`,
      ),
    enabled: canView,
  });

  const periodsQuery = useQuery({
    queryKey: ['academic-periods-active'],
    queryFn: () => apiClient<Paginated<AcademicPeriod>>(`/academic-periods${qs({ per_page: 100 })}`),
    enabled: canManage && modalOpen,
  });

  const gradesQuery = useQuery({
    queryKey: ['grades-options'],
    queryFn: () => apiClient<Paginated<Grade>>(`/grades${qs({ per_page: 100, include: 'subjects' })}`),
    enabled: canManage && modalOpen && form.scope === 'general',
  });

  const studentsQuery = useQuery({
    queryKey: ['students-options-materials'],
    queryFn: () => apiClient<Paginated<Student>>(`/students${qs({ per_page: 200 })}`),
    enabled: canManage && modalOpen && form.scope === 'targeted',
  });

  const activePeriod = useMemo(
    () => periodsQuery.data?.data.find((p) => p.status === 'active'),
    [periodsQuery.data?.data],
  );

  const selectedGrade = gradesQuery.data?.data.find((g) => String(g.id) === form.grade_id);
  const subjects = selectedGrade?.subjects ?? [];

  const rows = materialsQuery.data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!mediaId || !activePeriod) throw new Error('اختر ملفًا وفترة نشطة.');
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        media_id: mediaId,
        scope: form.scope,
        period_id: activePeriod.id,
      };
      if (form.scope === 'general') {
        payload.grade_id = Number(form.grade_id);
        payload.subject_id = Number(form.subject_id);
      } else {
        payload.student_id = Number(form.student_id);
        if (form.grade_id) payload.grade_id = Number(form.grade_id);
        if (form.subject_id) payload.subject_id = Number(form.subject_id);
      }
      return apiClient('/educational-materials', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success('تم رفع المادة');
      setModalOpen(false);
      setForm(emptyForm());
      setMediaId(null);
      setMediaUrl(null);
      qc.invalidateQueries({ queryKey: ['educational-materials'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/educational-materials/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم حذف المادة');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['educational-materials'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!canView) {
    return (
      <>
        <AdminHeader title="المواد التعليمية" crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">ليس لديك صلاحية الوصول.</AdminContent>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="المواد التعليمية" crumb="المواد التعليمية" />
      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <p className="text-[13px] text-ink-dim">مذكرات وملفات رقمية للطلاب</p>
            {canManage ? (
              <button
                type="button"
                onClick={() => {
                  setForm(emptyForm());
                  setMediaId(null);
                  setMediaUrl(null);
                  setModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-[13px] font-extrabold text-navy"
              >
                <Icon name="fa-solid fa-upload" className="text-[11px]" />
                رفع مادة جديدة
              </button>
            ) : null}
          </div>

          {materialsQuery.isLoading ? (
            <TableSkeleton rows={5} />
          ) : rows.length === 0 ? (
            <EmptyState icon="fa-solid fa-file-pdf" title="لا توجد مواد" body="لم تُرفع مواد تعليمية بعد." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {['العنوان', 'النطاق', 'الاستهداف', 'تاريخ الرفع', ''].map((c) => (
                      <th key={c} className="whitespace-nowrap px-4 py-3 text-right text-[11.5px] font-bold text-ink-dim">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                      <td className="px-4 py-3 text-[13px] font-bold text-ink">{row.title}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.scope} />
                      </td>
                      <td className="px-4 py-3 text-[13px] text-ink-soft">
                        {row.scope === 'general'
                          ? `${row.grade?.name ?? '—'} / ${row.subject?.name ?? '—'}`
                          : row.student?.full_name ?? '—'}
                      </td>
                      <td className="font-latin whitespace-nowrap px-4 py-3 text-[12.5px] text-ink-soft">
                        {row.created_at ? String(row.created_at).slice(0, 10) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {row.media?.url ? (
                            <a
                              href={row.media.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-full border border-cream-line2 px-2.5 py-1 text-[11.5px] font-semibold text-navy"
                            >
                              <Icon name="fa-solid fa-download" className="text-[10px]" />
                              تنزيل
                            </a>
                          ) : null}
                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(row)}
                              className="inline-flex items-center gap-1 rounded-full border border-[#efd4d4] px-2.5 py-1 text-[11.5px] font-semibold text-[#a34b4b]"
                            >
                              حذف
                            </button>
                          ) : null}
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

      <FormModal
        open={modalOpen}
        onClose={() => !saveMutation.isPending && setModalOpen(false)}
        title="رفع مادة جديدة"
        eyebrow="MATERIAL"
        wide
        footer={
          <>
            <button type="button" onClick={() => setModalOpen(false)} className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft">
              إلغاء
            </button>
            <button
              type="button"
              disabled={saveMutation.isPending || !mediaId || !form.title.trim() || !activePeriod}
              onClick={() => saveMutation.mutate()}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy disabled:opacity-70"
            >
              {saveMutation.isPending ? 'جاري الرفع…' : 'رفع'}
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          <MediaPicker
            label="الملف"
            valueId={mediaId ?? undefined}
            valueUrl={mediaUrl ?? undefined}
            onChange={(m) => {
              setMediaId(m.id);
              setMediaUrl(m.url);
            }}
            onClear={() => {
              setMediaId(null);
              setMediaUrl(null);
            }}
          />
          <div>
            <label className={formLabelClass}>العنوان</label>
            <input className={formFieldClass} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className={formLabelClass}>الوصف (اختياري)</label>
            <textarea className={`${formFieldClass} min-h-[72px]`} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className={formLabelClass}>النطاق</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {(['general', 'targeted'] as const).map((scope) => (
                <label key={scope} className={`cursor-pointer rounded-full border px-3 py-2 text-[12.5px] font-bold ${form.scope === scope ? 'border-navy bg-navy text-white' : 'border-cream-line2 bg-white text-ink-soft'}`}>
                  <input type="radio" className="sr-only" checked={form.scope === scope} onChange={() => setForm((f) => ({ ...f, scope }))} />
                  {scope === 'general' ? 'عام' : 'خاص'}
                </label>
              ))}
            </div>
          </div>
          {form.scope === 'general' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={formLabelClass}>الصف</label>
                <select className={formFieldClass} value={form.grade_id} onChange={(e) => setForm((f) => ({ ...f, grade_id: e.target.value, subject_id: '' }))}>
                  <option value="">اختر…</option>
                  {(gradesQuery.data?.data ?? []).map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={formLabelClass}>المادة</label>
                <select className={formFieldClass} value={form.subject_id} onChange={(e) => setForm((f) => ({ ...f, subject_id: e.target.value }))}>
                  <option value="">اختر…</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label className={formLabelClass}>الطالب</label>
              <select className={formFieldClass} value={form.student_id} onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))}>
                <option value="">اختر…</option>
                {(studentsQuery.data?.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name} — {s.file_number}</option>
                ))}
              </select>
            </div>
          )}
          {!activePeriod && periodsQuery.isSuccess ? (
            <p className="text-[12.5px] font-semibold text-[#a34b4b]">لا توجد فترة دراسية نشطة.</p>
          ) : null}
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="حذف المادة"
        body={`هل تريد حذف "${deleteTarget?.title}"؟`}
        confirmLabel="حذف"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  );
}
