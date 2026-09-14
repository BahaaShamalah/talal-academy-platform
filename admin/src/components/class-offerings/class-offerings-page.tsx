'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
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
  type AcademicPeriod,
  type ClassOffering,
  type ClassOfferingStatus,
  type Grade,
  type Hall,
  type Paginated,
  type Subject,
  type TeacherUser,
} from '@/lib/api-client';
import { formatScheduleSlot } from '@/lib/weekdays';
import { useAuthStore } from '@/stores/auth-store';

type FormState = {
  grade_id: string;
  subject_id: string;
  teacher_id: string;
  hall_id: string;
  period_id: string;
  status: ClassOfferingStatus;
};

const emptyForm: FormState = {
  grade_id: '',
  subject_id: '',
  teacher_id: '',
  hall_id: '',
  period_id: '',
  status: 'active',
};

const STATUSES: { id: ClassOfferingStatus; label: string }[] = [
  { id: 'active', label: 'نشطة' },
  { id: 'closed', label: 'متوقفة' },
];

export function ClassOfferingsPage({ embedded }: { embedded?: boolean } = {}) {
  const router = useRouter();
  const canManage = useAuthStore((s) => s.hasPermission('course-groups.manage'));
  const qc = useQueryClient();

  const [gradeId, setGradeId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClassOffering | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ClassOffering | null>(null);

  const gradesQuery = useQuery({
    queryKey: ['grades-options'],
    queryFn: () =>
      apiClient<Paginated<Grade>>(`/grades${qs({ per_page: 100, include: 'subjects' })}`),
  });

  const subjectsQuery = useQuery({
    queryKey: ['subjects-options'],
    queryFn: () => apiClient<Paginated<Subject>>(`/subjects${qs({ per_page: 100 })}`),
  });

  const periodsQuery = useQuery({
    queryKey: ['academic-periods-options'],
    queryFn: () => apiClient<Paginated<AcademicPeriod>>(`/academic-periods${qs({ per_page: 100 })}`),
    enabled: modalOpen,
  });

  const teachersQuery = useQuery({
    queryKey: ['teachers', 'subject', form.subject_id],
    queryFn: () =>
      apiClient<Paginated<TeacherUser>>(
        `/teachers${qs({
          per_page: 100,
          'filter[subject_id]': form.subject_id || undefined,
        })}`,
      ),
    enabled: modalOpen && Boolean(form.subject_id),
  });

  const hallsQuery = useQuery({
    queryKey: ['halls-options'],
    queryFn: () => apiClient<Paginated<Hall>>(`/halls${qs({ per_page: 100 })}`),
    enabled: modalOpen,
  });

  const offeringsQuery = useQuery({
    queryKey: ['class-offerings', gradeId, subjectId, status],
    queryFn: () =>
      apiClient<Paginated<ClassOffering>>(
        `/class-offerings${qs({
          include: 'grade,subject,teacher,hall,period,schedules',
          per_page: 100,
          'filter[grade_id]': gradeId || undefined,
          'filter[subject_id]': subjectId || undefined,
          'filter[status]': status || undefined,
        })}`,
      ),
  });

  const grades = gradesQuery.data?.data ?? [];
  const subjects = subjectsQuery.data?.data ?? [];
  const offerings = offeringsQuery.data?.data ?? [];

  const gradeSubjects = useMemo(() => {
    if (!form.grade_id) return subjects;
    const grade = grades.find((g) => String(g.id) === form.grade_id);
    return grade?.subjects?.length ? grade.subjects : subjects;
  }, [form.grade_id, grades, subjects]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        grade_id: Number(form.grade_id),
        subject_id: Number(form.subject_id),
        teacher_id: Number(form.teacher_id),
        hall_id: Number(form.hall_id),
        status: form.status,
      };
      if (form.period_id.trim()) {
        payload.period_id = Number(form.period_id);
      } else if (editing) {
        payload.period_id = null;
      }

      if (editing) {
        return apiClient<ClassOffering>(`/class-offerings/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }

      return apiClient<ClassOffering>('/class-offerings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (offering) => {
      toast.success(editing ? 'تم تحديث عرض المادة' : 'تم إضافة عرض المادة');
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ['class-offerings'] });
      if (!editing && offering?.id) {
        router.push(`/dashboard/class-offerings/${offering.id}`);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/class-offerings/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم حذف عرض المادة');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['class-offerings'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, grade_id: gradeId });
    setModalOpen(true);
  }

  function openEdit(offering: ClassOffering) {
    setEditing(offering);
    setForm({
      grade_id: String(offering.grade_id),
      subject_id: String(offering.subject_id),
      teacher_id: String(offering.teacher_id),
      hall_id: String(offering.hall_id),
      period_id: offering.period_id != null ? String(offering.period_id) : '',
      status: offering.status,
    });
    setModalOpen(true);
  }

  const selectCls =
    'rounded-[11px] border border-cream-line bg-cream-soft px-2.5 py-2 text-[12.5px] text-ink-soft';
  const loading = offeringsQuery.isLoading;
  const isEmpty = !loading && offerings.length === 0;
  const teachers = teachersQuery.data?.data ?? [];
  const halls = hallsQuery.data?.data ?? [];
  const periods = periodsQuery.data?.data ?? [];

  const panel = (
    <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <select className={selectCls} value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
                <option value="">كل الصفوف</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <select className={selectCls} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">كل المواد</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">كل الحالات</option>
                {STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
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
                <Icon name="fa-solid fa-plus" className="text-[12px]" /> إضافة عرض
              </button>
            ) : null}
          </div>

          {loading ? <TableSkeleton cols={7} /> : null}

          {isEmpty ? (
            <EmptyState
              icon="fa-solid fa-calendar-week"
              title="لا توجد عروض مطابقة"
              body="لم نجد عروض مواد تطابق الفلاتر. أضف عرضًا جديدًا أو وسّع نطاق البحث."
              primary={canManage ? { label: 'إضافة عرض', onClick: openCreate } : undefined}
              secondary={{
                label: 'إعادة ضبط الفلاتر',
                onClick: () => {
                  setGradeId('');
                  setSubjectId('');
                  setStatus('');
                },
              }}
            />
          ) : null}

          {!loading && !isEmpty ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {['المادة', 'الصف', 'المعلم', 'القاعة', 'الجدول', 'الحالة', ''].map((c, i) => (
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
                  {offerings.map((o) => {
                    const schedules = o.schedules ?? [];
                    const hasSchedule = schedules.length > 0;
                    return (
                      <tr key={o.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2 text-[13.5px] font-bold text-ink">
                            <span>{o.subject?.name ?? '—'}</span>
                            {!hasSchedule ? (
                              <span className="rounded-full bg-[#fdf6f6] px-2 py-0.5 text-[10.5px] font-bold text-[#a34b4b]">
                                بدون جدول
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                          {o.grade?.name ?? '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                          {o.teacher?.name ?? '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                          {o.hall?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-[12.5px] text-ink-soft">
                          {hasSchedule ? (
                            <div className="space-y-1">
                              {schedules.map((s) => (
                                <div key={s.id} className="font-latin whitespace-nowrap" dir="ltr">
                                  {formatScheduleSlot(s.day_of_week, s.start_time, s.end_time)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[12px] text-ink-dim">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={o.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <Link
                              href={`/dashboard/class-offerings/${o.id}`}
                              aria-label="تفاصيل"
                              className="inline-flex h-[31px] items-center gap-1 rounded-[9px] border border-cream-line bg-white px-2.5 text-[11.5px] font-bold text-navy"
                            >
                              <Icon name="fa-solid fa-eye" className="text-[11px]" />
                              تفاصيل
                            </Link>
                            {canManage ? (
                              <>
                                <button
                                  type="button"
                                  aria-label="تعديل"
                                  onClick={() => openEdit(o)}
                                  className="h-[31px] w-[31px] rounded-[9px] border border-cream-line bg-white text-ink-soft"
                                >
                                  <Icon name="fa-solid fa-pen" className="text-[11px]" />
                                </button>
                                <button
                                  type="button"
                                  aria-label="حذف"
                                  onClick={() => setDeleteTarget(o)}
                                  className="h-[31px] w-[31px] rounded-[9px] border border-[#f2dede] bg-white text-[#a34b4b]"
                                >
                                  <Icon name="fa-solid fa-trash" className="text-[11px]" />
                                </button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
          <AdminHeader title="عروض المواد" crumb="الشؤون الأكاديمية ← الجداول" />
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
        title={editing ? 'تعديل عرض مادة' : 'إضافة عرض مادة'}
        eyebrow="CLASS OFFERING"
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
                if (!form.grade_id || !form.subject_id || !form.teacher_id || !form.hall_id) {
                  toast.error('أكمل الصف والمادة والمعلم والقاعة');
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
          <div>
            <label className={formLabelClass}>الصف</label>
            <select
              className={formFieldClass}
              value={form.grade_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, grade_id: e.target.value, subject_id: '' }))
              }
            >
              <option value="">اختر الصف</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={formLabelClass}>المادة</label>
            <select
              className={formFieldClass}
              value={form.subject_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, subject_id: e.target.value, teacher_id: '' }))
              }
            >
              <option value="">اختر المادة</option>
              {gradeSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={formLabelClass}>المعلم</label>
            <select
              className={formFieldClass}
              value={form.teacher_id}
              disabled={!form.subject_id}
              onChange={(e) => setForm((f) => ({ ...f, teacher_id: e.target.value }))}
            >
              <option value="">{form.subject_id ? 'اختر المعلم' : 'اختر المادة أولًا'}</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={formLabelClass}>القاعة</label>
            <select
              className={formFieldClass}
              value={form.hall_id}
              onChange={(e) => setForm((f) => ({ ...f, hall_id: e.target.value }))}
            >
              <option value="">اختر القاعة</option>
              {halls.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={formLabelClass}>الفترة الدراسية (اختياري)</label>
            <select
              className={formFieldClass}
              value={form.period_id}
              onChange={(e) => setForm((f) => ({ ...f, period_id: e.target.value }))}
            >
              <option value="">—</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          {editing ? (
            <div>
              <label className={formLabelClass}>الحالة</label>
              <select
                className={formFieldClass}
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as ClassOfferingStatus }))
                }
              >
                {STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="حذف عرض المادة؟"
        body={`سيتم حذف «${deleteTarget?.subject?.name ?? ''} — ${deleteTarget?.grade?.name ?? ''}». إذا كان فيه تسجيلات فسيرفض الخادم الحذف.`}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  );
}
