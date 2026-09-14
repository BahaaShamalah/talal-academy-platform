'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
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
import { SchoolSelect } from '@/components/ui/school-select';
import {
  apiClient,
  qs,
  type ClassOffering,
  type Enrollment,
  type EnrollmentStatus,
  type Grade,
  type Paginated,
  type Student,
  type Subject,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

const ENROLLMENT_STATUS_OPTIONS: { value: EnrollmentStatus; label: string }[] = [
  { value: 'pending_payment', label: 'بانتظار الدفع' },
  { value: 'active', label: 'نشط' },
  { value: 'suspended', label: 'موقوف' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'cancelled', label: 'ملغى' },
];

type AssignmentRow = {
  class_offering_id: number;
  status: EnrollmentStatus;
};

type StudentFields = {
  full_name: string;
  current_grade_id: string;
  previous_school: string;
  phone: string;
  phone_secondary: string;
  civil_id: string;
};

type CreateForm = StudentFields;

type EditForm = StudentFields & {
  assignments: AssignmentRow[];
};

const emptyCreate: CreateForm = {
  full_name: '',
  current_grade_id: '',
  previous_school: '',
  phone: '',
  phone_secondary: '',
  civil_id: '',
};

const cell = 'px-4 py-3 text-center align-middle';
const headCell = 'whitespace-nowrap px-4 py-3 text-center text-[11.5px] font-bold text-ink-dim';

function stageLabel(student?: Student | null) {
  const grade = student?.current_grade;
  if (!grade) return '—';
  return grade.educational_stage?.name
    ? `${grade.educational_stage.name} — ${grade.name}`
    : grade.name;
}

/** Unique grade-section names from enrollments (e.g. «السادس ذكور»). */
function gradeSectionChips(enrollments?: Enrollment[]) {
  if (!enrollments?.length) return null;

  const seen = new Set<string>();
  const chips: { key: string; label: string }[] = [];

  for (const e of enrollments) {
    if (e.status === 'cancelled' || e.status === 'completed') continue;

    const section = e.class_offering?.grade_section;
    const label =
      section?.name?.trim() ||
      e.class_offering?.grade?.name ||
      null;
    if (!label) continue;

    const key = section?.id != null ? `gs-${section.id}` : `label-${label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    chips.push({ key, label });
  }

  if (!chips.length) return null;

  return chips.map((c) => (
    <span
      key={c.key}
      className="inline-flex items-center gap-1 rounded-full border border-cream-line bg-cream-soft px-2.5 py-1 text-[11.5px] font-semibold text-ink-soft"
    >
      {c.label}
    </span>
  ));
}

function studentFromEnrollments(enrollments: Enrollment[]): AssignmentRow[] {
  return enrollments.map((e) => ({
    class_offering_id: e.class_offering_id,
    status: e.status,
  }));
}

type OfferingOption = {
  id: number;
  subjectName: string;
  gradeName: string;
  gradeId: number;
  teacherName?: string;
  hallName?: string;
};

function offeringsForGrade(allOfferings: OfferingOption[], gradeId: string) {
  if (!gradeId) return [];
  return allOfferings.filter((o) => String(o.gradeId) === gradeId);
}

function buildOfferingsBySubject(offerings: OfferingOption[]) {
  const map = new Map<string, OfferingOption[]>();
  for (const o of offerings) {
    const key = o.subjectName || 'بدون مادة';
    const list = map.get(key) ?? [];
    list.push(o);
    map.set(key, list);
  }
  return map;
}

function GroupAssignmentSection({
  gradeId,
  assignments,
  allOfferings,
  loading,
  loadError,
  onToggle,
  onStatusChange,
}: {
  gradeId: string;
  assignments: AssignmentRow[];
  allOfferings: OfferingOption[];
  loading: boolean;
  loadError: boolean;
  onToggle: (offeringId: number) => void;
  onStatusChange: (offeringId: number, status: EnrollmentStatus) => void;
}) {
  const offerings = useMemo(
    () => offeringsForGrade(allOfferings, gradeId),
    [allOfferings, gradeId],
  );
  const bySubject = useMemo(() => buildOfferingsBySubject(offerings), [offerings]);

  if (!gradeId) {
    return (
      <p className="rounded-[12px] border border-cream-line bg-cream-soft/60 p-3 text-[13px] text-ink-dim">
        اختر المرحلة / الصف أولًا لعرض عروض المواد المتاحة.
      </p>
    );
  }

  if (loading) {
    return <p className="text-[13px] text-ink-dim">جاري تحميل عروض المواد…</p>;
  }

  if (loadError) {
    return (
      <p className="rounded-[12px] border border-[#f2dede] bg-[#fdf8f8] p-3 text-[13px] text-[#a34b4b]">
        تعذّر تحميل عروض المواد. تأكد من صلاحياتك أو أضف عروضًا من قسم عروض المواد.
      </p>
    );
  }

  if (offerings.length === 0) {
    return (
      <p className="rounded-[12px] border border-cream-line bg-cream-soft/60 p-3 text-[13px] text-ink-dim">
        لا توجد عروض مواد مسجّلة لهذا الصف.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {[...bySubject.entries()].map(([subjectName, subjectOfferings]) => (
        <div
          key={subjectName}
          className="rounded-[14px] border border-cream-line bg-cream-soft/30 p-3.5"
        >
          <div className="mb-2.5 text-[13px] font-extrabold text-navy">{subjectName}</div>
          <div className="space-y-2">
            {subjectOfferings.map((o) => {
              const selected = assignments.find((a) => a.class_offering_id === o.id);
              return (
                <div
                  key={o.id}
                  className="flex flex-wrap items-center gap-2 rounded-[10px] border border-cream-line bg-white px-3 py-2"
                >
                  <label className="flex flex-1 cursor-pointer items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      checked={Boolean(selected)}
                      onChange={() => onToggle(o.id)}
                      className="h-4 w-4 accent-navy"
                    />
                    <span className="font-semibold text-ink">
                      {[o.teacherName, o.hallName].filter(Boolean).join(' — ') || o.gradeName}
                      {o.teacherName ? (
                        <span className="font-normal text-ink-dim"> — {o.gradeName}</span>
                      ) : null}
                    </span>
                  </label>
                  {selected ? (
                    <select
                      className={`${formFieldClass} w-auto min-w-[130px] py-1.5 text-[12px]`}
                      value={selected.status}
                      onChange={(e) =>
                        onStatusChange(o.id, e.target.value as EnrollmentStatus)
                      }
                    >
                      {ENROLLMENT_STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function EnrollmentsPage() {
  const canView = useAuthStore((s) => s.hasPermission('enrollments.view'));
  const canManage = useAuthStore((s) => s.hasPermission('enrollments.manage'));
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [assigned, setAssigned] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreate);
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);

  const studentsQuery = useQuery({
    queryKey: ['enrollment-students', gradeId, subjectId, assigned],
    queryFn: () =>
      apiClient<Paginated<Student>>(
        `/students${qs({
          per_page: 200,
          include:
            'currentGrade.educationalStage,enrollments.classOffering.gradeSection',
          'filter[current_grade_id]': gradeId || undefined,
          'filter[subject_id]': subjectId || undefined,
          'filter[assigned]': assigned || undefined,
        })}`,
      ),
    enabled: canView,
  });

  const gradesQuery = useQuery({
    queryKey: ['grades-options'],
    queryFn: () =>
      apiClient<Paginated<Grade>>(
        `/grades${qs({ per_page: 100, include: 'educationalStage' })}`,
      ),
    enabled: canView,
  });

  const subjectsQuery = useQuery({
    queryKey: ['subjects-options'],
    queryFn: () => apiClient<Paginated<Subject>>(`/subjects${qs({ per_page: 100 })}`),
    enabled: canView,
  });

  const allOfferingsQuery = useQuery({
    queryKey: ['class-offerings-all'],
    queryFn: () =>
      apiClient<Paginated<ClassOffering>>(
        `/class-offerings${qs({
          per_page: 500,
          include: 'subject,teacher,hall,grade',
        })}`,
      ),
    enabled: canView && canManage && Boolean(editTarget),
  });

  const students = studentsQuery.data?.data ?? [];
  const grades = gradesQuery.data?.data ?? [];
  const subjects = subjectsQuery.data?.data ?? [];
  const allOfferings: OfferingOption[] = useMemo(() => {
    const list: OfferingOption[] = [];
    for (const o of allOfferingsQuery.data?.data ?? []) {
      list.push({
        id: o.id,
        subjectName: o.subject?.name ?? 'مادة',
        gradeName: o.grade?.name ?? 'صف',
        gradeId: o.grade_id,
        teacherName: o.teacher?.name,
        hallName: o.hall?.name,
      });
    }
    return list;
  }, [allOfferingsQuery.data?.data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const enrollmentsText = (s.enrollments ?? [])
        .map((e) => {
          const co = e.class_offering;
          return `${co?.grade?.name ?? ''} ${co?.subject?.name ?? ''}`;
        })
        .join(' ');
      return (
        (s.full_name?.toLowerCase() ?? '').includes(q) ||
        (s.file_number?.toLowerCase() ?? '').includes(q) ||
        (s.previous_school?.toLowerCase() ?? '').includes(q) ||
        (s.phone ?? '').includes(q) ||
        (s.phone_secondary ?? '').includes(q) ||
        (s.civil_id ?? '').includes(q) ||
        stageLabel(s).toLowerCase().includes(q) ||
        enrollmentsText.toLowerCase().includes(q)
      );
    });
  }, [students, search]);

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient<Student>('/students', {
        method: 'POST',
        body: JSON.stringify({
          full_name: createForm.full_name.trim(),
          gender: 'male',
          current_grade_id: Number(createForm.current_grade_id),
          previous_school: createForm.previous_school.trim(),
          phone: createForm.phone.trim(),
          phone_secondary: createForm.phone_secondary.trim() || null,
          civil_id: createForm.civil_id.trim() || null,
        }),
      }),
    onSuccess: () => {
      toast.success('تم إضافة الطالب — يمكنك توزيعه على الشعب من التعديل');
      setCreateOpen(false);
      setCreateForm(emptyCreate);
      qc.invalidateQueries({ queryKey: ['enrollment-students'] });
      qc.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editTarget || !editForm) throw new Error('لا طالب محدد');
      await apiClient(`/students/${editTarget.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          full_name: editForm.full_name.trim(),
          current_grade_id: Number(editForm.current_grade_id),
          previous_school: editForm.previous_school.trim(),
          phone: editForm.phone.trim(),
          phone_secondary: editForm.phone_secondary.trim() || null,
          civil_id: editForm.civil_id.trim() || null,
        }),
      });
      return apiClient<Student>(`/students/${editTarget.id}/enrollments/sync`, {
        method: 'PUT',
        body: JSON.stringify({ assignments: editForm.assignments }),
      });
    },
    onSuccess: () => {
      toast.success('تم حفظ بيانات التسجيل والتوزيع');
      setEditTarget(null);
      setEditForm(null);
      qc.invalidateQueries({ queryKey: ['enrollment-students'] });
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['enrollments'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/students/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم حذف الطالب');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['enrollment-students'] });
      qc.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function toggleAssignment(
    assignments: AssignmentRow[],
    offeringId: number,
  ): AssignmentRow[] {
    const exists = assignments.some((a) => a.class_offering_id === offeringId);
    if (exists) {
      return assignments.filter((a) => a.class_offering_id !== offeringId);
    }
    return [...assignments, { class_offering_id: offeringId, status: 'pending_payment' }];
  }

  function setAssignmentStatusInList(
    assignments: AssignmentRow[],
    offeringId: number,
    status: EnrollmentStatus,
  ): AssignmentRow[] {
    return assignments.map((a) =>
      a.class_offering_id === offeringId ? { ...a, status } : a,
    );
  }

  function openCreate() {
    setCreateForm(emptyCreate);
    setCreateOpen(true);
  }

  function openEdit(student: Student) {
    setEditTarget(student);
    setEditForm({
      full_name: student.full_name ?? '',
      current_grade_id: String(student.current_grade_id ?? student.current_grade?.id ?? ''),
      previous_school: student.previous_school ?? '',
      phone: student.phone ?? '',
      phone_secondary: student.phone_secondary ?? '',
      civil_id: student.civil_id ?? '',
      assignments: studentFromEnrollments(student.enrollments ?? []),
    });
  }

  function handleGradeChangeInEdit(grade: string) {
    setEditForm((f) => {
      if (!f) return f;
      return { ...f, current_grade_id: grade, assignments: [] };
    });
  }

  function canCreate() {
    return Boolean(
      createForm.full_name.trim() &&
        createForm.current_grade_id &&
        createForm.previous_school.trim() &&
        createForm.phone.trim(),
    );
  }

  function canSaveEdit() {
    if (!editForm) return false;
    return Boolean(
      editForm.full_name.trim() &&
        editForm.current_grade_id &&
        editForm.previous_school.trim() &&
        editForm.phone.trim(),
    );
  }

  const loading = studentsQuery.isLoading;
  const isEmpty = !loading && filtered.length === 0;
  const columns = canManage ? 8 : 7;
  const groupsLoading = allOfferingsQuery.isLoading;
  const groupsLoadError = allOfferingsQuery.isError;

  if (!canView) {
    return (
      <>
        <AdminHeader title="التسجيلات" crumb="غير مصرح" />
        <AdminContent>
          <p className="text-[13.5px] text-ink-dim">ليس لديك صلاحية الوصول لهذه الصفحة.</p>
        </AdminContent>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="التسجيلات" crumb="الشؤون الأكاديمية ← التسجيلات" />
      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center gap-2.5 border-b border-[#f0ece1] p-3.5">
            <div className="relative min-w-[200px] flex-1">
              <Icon
                name="fa-solid fa-magnifying-glass"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-ink-faint"
              />
              <input
                className={`${formFieldClass} py-2.5 pe-9 text-[13px]`}
                placeholder="بحث بالاسم أو المدرسة أو الهاتف أو المادة…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className={`${formFieldClass} w-auto min-w-[150px] py-2.5 text-[13px]`}
              value={gradeId}
              onChange={(e) => setGradeId(e.target.value)}
            >
              <option value="">كل الصفوف</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.educational_stage?.name ? `${g.educational_stage.name} — ${g.name}` : g.name}
                </option>
              ))}
            </select>
            <select
              className={`${formFieldClass} w-auto min-w-[150px] py-2.5 text-[13px]`}
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              <option value="">كل المواد</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              className={`${formFieldClass} w-auto min-w-[150px] py-2.5 text-[13px]`}
              value={assigned}
              onChange={(e) => setAssigned(e.target.value)}
            >
              <option value="">كل التوزيع</option>
              <option value="0">بانتظار التوزيع</option>
              <option value="1">موزّع على شعب</option>
            </select>
            {canManage ? (
              <button
                type="button"
                onClick={openCreate}
                className="flex items-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-[13.5px] font-extrabold text-navy shadow-[0_12px_26px_-14px_rgba(200,162,74,.8)] transition-transform hover:-translate-y-px"
              >
                <Icon name="fa-solid fa-plus" className="text-[12px]" /> تسجيل جديد
              </button>
            ) : null}
          </div>

          {loading ? <TableSkeleton cols={columns} /> : null}
          {isEmpty ? (
            <EmptyState
              icon="fa-solid fa-file-signature"
              title="لا توجد تسجيلات"
              body={
                search || gradeId || subjectId || assigned
                  ? 'لا نتائج مطابقة للبحث أو الفلتر.'
                  : 'تظهر هنا بيانات الطلاب المسجّلين — وزّعهم على شعب المواد من التعديل.'
              }
              primary={canManage ? { label: 'تسجيل جديد', onClick: openCreate } : undefined}
            />
          ) : null}

          {!loading && !isEmpty ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-center">
                <thead>
                  <tr className="bg-cream-soft">
                    {[
                      'الاسم',
                      'المرحلة',
                      'المدرسة',
                      'هاتف التواصل',
                      'الرقم المدني',
                      'الشعبة',
                      'التوزيع',
                      ...(canManage ? ['إجراءات'] : []),
                    ].map((c) => (
                      <th key={c} className={headCell}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const hasGroups = (s.enrollments?.length ?? 0) > 0;
                    return (
                      <tr key={s.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                        <td className={cell}>
                          <div className="inline-flex flex-col items-center gap-0.5">
                            <Link
                              href={`/dashboard/student-files/${s.id}`}
                              className="text-[13.5px] font-bold text-ink hover:text-navy"
                            >
                              {s.full_name}
                            </Link>
                            <span className="font-latin text-[11px] text-ink-dim" dir="ltr">
                              {s.file_number ?? ''}
                            </span>
                          </div>
                        </td>
                        <td className={`${cell} text-[13px] text-ink-soft`}>{stageLabel(s)}</td>
                        <td className={`${cell} text-[13px] text-ink-soft`}>
                          {s.previous_school || '—'}
                        </td>
                        <td className={cell}>
                          <div className="font-latin text-[13px] text-ink-soft" dir="ltr">
                            {s.phone || '—'}
                          </div>
                          {s.phone_secondary ? (
                            <div className="font-latin mt-0.5 text-[11.5px] text-ink-dim" dir="ltr">
                              {s.phone_secondary}
                            </div>
                          ) : null}
                        </td>
                        <td className={`${cell} font-latin text-[12.5px] text-ink-dim`} dir="ltr">
                          {s.civil_id || '—'}
                        </td>
                        <td className={cell}>
                          <div className="flex flex-wrap items-center justify-center gap-1.5">
                            {hasGroups ? (
                              gradeSectionChips(s.enrollments)
                            ) : (
                              <span className="text-[12.5px] text-ink-dim">—</span>
                            )}
                          </div>
                        </td>
                        <td className={cell}>
                          {hasGroups ? (
                            <span className="inline-flex rounded-full bg-[#e8f5ee] px-3 py-1 text-[11.5px] font-bold text-[#2d7a4f]">
                              موزّع
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-[#fff4e5] px-3 py-1 text-[11.5px] font-bold text-[#b8730a]">
                              بانتظار التوزيع
                            </span>
                          )}
                        </td>
                        {canManage ? (
                          <td className={cell}>
                            <div className="inline-flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                aria-label="تعديل"
                                onClick={() => openEdit(s)}
                                className="h-[31px] w-[31px] rounded-[9px] border border-cream-line bg-white text-ink-soft"
                              >
                                <Icon name="fa-solid fa-pen" className="text-[11px]" />
                              </button>
                              <button
                                type="button"
                                aria-label="حذف"
                                onClick={() => setDeleteTarget(s)}
                                className="h-[31px] w-[31px] rounded-[9px] border border-[#f2dede] bg-white text-[#a34b4b]"
                              >
                                <Icon name="fa-solid fa-trash" className="text-[11px]" />
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </AdminContent>

      <FormModal
        open={createOpen}
        onClose={() => {
          if (!createMutation.isPending) {
            setCreateOpen(false);
            setCreateForm(emptyCreate);
          }
        }}
        title="تسجيل جديد"
        eyebrow="REGISTRATION"
        wide
        footer={
          <>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={createMutation.isPending || !canCreate()}
              onClick={() => createMutation.mutate()}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy disabled:opacity-70"
            >
              {createMutation.isPending ? 'جاري الحفظ…' : 'حفظ'}
            </button>
          </>
        }
      >
        <p className="mb-3.5 text-[13px] text-ink-dim">
          أدخل بيانات الطالب — يمكن توزيعه على شعب المواد لاحقًا من التعديل.
        </p>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={formLabelClass}>اسم الطالب *</label>
            <input
              className={formFieldClass}
              value={createForm.full_name}
              onChange={(e) => setCreateForm((f) => ({ ...f, full_name: e.target.value }))}
            />
          </div>
          <div>
            <label className={formLabelClass}>المرحلة / الصف *</label>
            <select
              className={formFieldClass}
              value={createForm.current_grade_id}
              onChange={(e) => setCreateForm((f) => ({ ...f, current_grade_id: e.target.value }))}
            >
              <option value="">اختر المرحلة / الصف</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.educational_stage?.name
                    ? `${g.educational_stage.name} — ${g.name}`
                    : g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={formLabelClass}>المدرسة *</label>
            <SchoolSelect
              value={createForm.previous_school}
              onChange={(previous_school) => setCreateForm((f) => ({ ...f, previous_school }))}
            />
          </div>
          <div>
            <label className={formLabelClass}>رقم هاتف للتواصل *</label>
            <input
              className={`${formFieldClass} font-latin`}
              dir="ltr"
              inputMode="tel"
              value={createForm.phone}
              onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div>
            <label className={formLabelClass}>رقم هاتف إضافي (اختياري)</label>
            <input
              className={`${formFieldClass} font-latin`}
              dir="ltr"
              inputMode="tel"
              value={createForm.phone_secondary}
              onChange={(e) => setCreateForm((f) => ({ ...f, phone_secondary: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={formLabelClass}>الرقم المدني (اختياري)</label>
            <input
              className={`${formFieldClass} font-latin`}
              dir="ltr"
              value={createForm.civil_id}
              onChange={(e) => setCreateForm((f) => ({ ...f, civil_id: e.target.value }))}
            />
          </div>
        </div>
      </FormModal>

      <FormModal
        open={Boolean(editTarget && editForm)}
        onClose={() => {
          if (!saveMutation.isPending) {
            setEditTarget(null);
            setEditForm(null);
          }
        }}
        title="تعديل التسجيل والتوزيع"
        eyebrow="EDIT"
        extraWide
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setEditTarget(null);
                setEditForm(null);
              }}
              className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={saveMutation.isPending || !canSaveEdit()}
              onClick={() => saveMutation.mutate()}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy disabled:opacity-70"
            >
              {saveMutation.isPending ? 'جاري الحفظ…' : 'حفظ'}
            </button>
          </>
        }
      >
        {editForm ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={formLabelClass}>اسم الطالب *</label>
                <input
                  className={formFieldClass}
                  value={editForm.full_name}
                  onChange={(e) => setEditForm((f) => f && { ...f, full_name: e.target.value })}
                />
              </div>
              <div>
                <label className={formLabelClass}>المرحلة / الصف *</label>
                <select
                  className={formFieldClass}
                  value={editForm.current_grade_id}
                  onChange={(e) => handleGradeChangeInEdit(e.target.value)}
                >
                  <option value="">اختر المرحلة / الصف</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.educational_stage?.name
                        ? `${g.educational_stage.name} — ${g.name}`
                        : g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={formLabelClass}>المدرسة *</label>
                <SchoolSelect
                  value={editForm.previous_school}
                  onChange={(previous_school) =>
                    setEditForm((f) => f && { ...f, previous_school })
                  }
                />
              </div>
              <div>
                <label className={formLabelClass}>رقم هاتف للتواصل *</label>
                <input
                  className={`${formFieldClass} font-latin`}
                  dir="ltr"
                  inputMode="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => f && { ...f, phone: e.target.value })}
                />
              </div>
              <div>
                <label className={formLabelClass}>رقم هاتف إضافي</label>
                <input
                  className={`${formFieldClass} font-latin`}
                  dir="ltr"
                  inputMode="tel"
                  value={editForm.phone_secondary}
                  onChange={(e) =>
                    setEditForm((f) => f && { ...f, phone_secondary: e.target.value })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <label className={formLabelClass}>الرقم المدني</label>
                <input
                  className={`${formFieldClass} font-latin`}
                  dir="ltr"
                  value={editForm.civil_id}
                  onChange={(e) => setEditForm((f) => f && { ...f, civil_id: e.target.value })}
                />
              </div>
            </div>

            <div>
              <h3 className="mb-1 text-[13.5px] font-extrabold text-navy">توزيع على شعب المواد</h3>
              <p className="mb-3 text-[12.5px] text-ink-dim">
                اختر مادة أو أكثر — يمكن للطالب التسجيل في عدة شعب.
              </p>
              <GroupAssignmentSection
                gradeId={editForm.current_grade_id}
                assignments={editForm.assignments}
                allOfferings={allOfferings}
                loading={groupsLoading}
                loadError={groupsLoadError}
                onToggle={(offeringId) =>
                  setEditForm((f) =>
                    f ? { ...f, assignments: toggleAssignment(f.assignments, offeringId) } : f,
                  )
                }
                onStatusChange={(offeringId, status) =>
                  setEditForm((f) =>
                    f
                      ? {
                          ...f,
                          assignments: setAssignmentStatusInList(f.assignments, offeringId, status),
                        }
                      : f,
                  )
                }
              />
            </div>
          </div>
        ) : null}
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleteMutation.isPending) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        title="حذف الطالب؟"
        body={`سيتم حذف «${deleteTarget?.full_name ?? ''}» وجميع تسجيلاته في الشعب.`}
        loading={deleteMutation.isPending}
        confirmLabel="حذف"
      />
    </>
  );
}
