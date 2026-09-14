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
import { SchoolSelect } from '@/components/ui/school-select';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  apiClient,
  qs,
  type Gender,
  type Grade,
  type Guardian,
  type GuardianRelationship,
  type Paginated,
  type Student,
  type StudentStatus,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type GuardianFormState = {
  full_name: string;
  phone: string;
  relationship: GuardianRelationship;
  civil_id: string;
  phone_secondary: string;
  email: string;
  address: string;
};

type FormState = {
  full_name: string;
  gender: Gender;
  civil_id: string;
  nationality: string;
  date_of_birth: string;
  phone: string;
  phone_secondary: string;
  address: string;
  previous_school: string;
  current_grade_id: string;
  status: StudentStatus;
  notes: string;
  photo_path: string;
  guardianMode: 'existing' | 'new' | 'none';
  guardian_id: string;
  guardian: GuardianFormState;
};

const emptyGuardian: GuardianFormState = {
  full_name: '',
  phone: '',
  relationship: 'أب',
  civil_id: '',
  phone_secondary: '',
  email: '',
  address: '',
};

const emptyForm: FormState = {
  full_name: '',
  gender: 'male',
  civil_id: '',
  nationality: '',
  date_of_birth: '',
  phone: '',
  phone_secondary: '',
  address: '',
  previous_school: '',
  current_grade_id: '',
  status: 'active',
  notes: '',
  photo_path: '',
  guardianMode: 'new',
  guardian_id: '',
  guardian: emptyGuardian,
};

const GENDERS: { id: Gender; label: string }[] = [
  { id: 'male', label: 'ذكر' },
  { id: 'female', label: 'أنثى' },
];

const STATUSES: { id: StudentStatus; label: string }[] = [
  { id: 'active', label: 'نشط' },
  { id: 'inactive', label: 'غير نشط' },
  { id: 'graduated', label: 'متخرج' },
];

const RELATIONSHIPS: GuardianRelationship[] = ['أب', 'أم', 'ولي أمر آخر'];

function genderLabel(g?: Gender | null) {
  return GENDERS.find((x) => x.id === g)?.label ?? '—';
}

export function StudentsPage() {
  const canManage = useAuthStore((s) => s.hasPermission('students.manage'));
  const canViewGuardians = useAuthStore((s) => s.hasPermission('guardians.view'));
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);

  const gradesQuery = useQuery({
    queryKey: ['grades-options'],
    queryFn: () => apiClient<Paginated<Grade>>(`/grades${qs({ per_page: 100 })}`),
  });

  const guardiansQuery = useQuery({
    queryKey: ['guardians-options'],
    queryFn: () => apiClient<Paginated<Guardian>>(`/guardians${qs({ per_page: 100 })}`),
    enabled: canViewGuardians,
  });

  const studentsQuery = useQuery({
    queryKey: ['students', search, gradeId, status],
    queryFn: () =>
      apiClient<Paginated<Student>>(
        `/students${qs({
          include: 'guardian,currentGrade',
          per_page: 50,
          'filter[search]': search.trim() || undefined,
          'filter[current_grade_id]': gradeId || undefined,
          'filter[status]': status || undefined,
        })}`,
      ),
  });

  const grades = gradesQuery.data?.data ?? [];
  const guardians = guardiansQuery.data?.data ?? [];
  const students = studentsQuery.data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        full_name: form.full_name.trim(),
        gender: form.gender,
        civil_id: form.civil_id.trim() || null,
        nationality: form.nationality.trim() || null,
        date_of_birth: form.date_of_birth || null,
        phone: form.phone.trim() || null,
        phone_secondary: form.phone_secondary.trim() || null,
        address: form.address.trim() || null,
        previous_school: form.previous_school.trim() || null,
        current_grade_id: form.current_grade_id ? Number(form.current_grade_id) : null,
        status: form.status,
        notes: form.notes.trim() || null,
        photo_path: form.photo_path.trim() || null,
      };

      if (editing) {
        payload.guardian_id = form.guardian_id ? Number(form.guardian_id) : null;
        return apiClient(`/students/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }

      if (form.guardianMode === 'existing' && form.guardian_id) {
        payload.guardian_id = Number(form.guardian_id);
      } else if (form.guardianMode === 'new') {
        payload.guardian = {
          full_name: form.guardian.full_name.trim(),
          phone: form.guardian.phone.trim(),
          relationship: form.guardian.relationship,
          civil_id: form.guardian.civil_id.trim() || null,
          phone_secondary: form.guardian.phone_secondary.trim() || null,
          email: form.guardian.email.trim() || null,
          address: form.guardian.address.trim() || null,
        };
      }

      return apiClient('/students', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast.success(editing ? 'تم تحديث الطالب بنجاح' : 'تم إضافة الطالب بنجاح');
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['guardians-options'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/students/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم حذف الطالب');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, current_grade_id: gradeId, guardianMode: canViewGuardians ? 'new' : 'none' });
    setModalOpen(true);
  }

  function openEdit(student: Student) {
    setEditing(student);
    setForm({
      full_name: student.full_name,
      gender: student.gender ?? 'male',
      civil_id: student.civil_id ?? '',
      nationality: student.nationality ?? '',
      date_of_birth: student.date_of_birth ?? '',
      phone: student.phone ?? '',
      phone_secondary: student.phone_secondary ?? '',
      address: student.address ?? '',
      previous_school: student.previous_school ?? '',
      current_grade_id: student.current_grade_id ? String(student.current_grade_id) : '',
      status: student.status ?? 'active',
      notes: student.notes ?? '',
      photo_path: student.photo_path ?? '',
      guardianMode: 'existing',
      guardian_id: student.guardian_id ? String(student.guardian_id) : '',
      guardian: emptyGuardian,
    });
    setModalOpen(true);
  }

  function validateForm(): boolean {
    if (!form.full_name.trim()) {
      toast.error('اسم الطالب مطلوب');
      return false;
    }
    if (!form.current_grade_id) {
      toast.error('المرحلة مطلوبة');
      return false;
    }
    if (!form.previous_school.trim()) {
      toast.error('المدرسة مطلوبة');
      return false;
    }
    if (!form.phone.trim()) {
      toast.error('رقم هاتف التواصل مطلوب');
      return false;
    }
    if (!editing && form.guardianMode === 'existing' && !form.guardian_id) {
      toast.error('اختر ولي الأمر أو غيّر طريقة الربط');
      return false;
    }
    if (!editing && form.guardianMode === 'new') {
      if (!form.guardian.full_name.trim()) {
        toast.error('اسم ولي الأمر مطلوب');
        return false;
      }
      if (!form.guardian.phone.trim()) {
        toast.error('هاتف ولي الأمر مطلوب');
        return false;
      }
    }
    return true;
  }

  const selectCls =
    'rounded-[11px] border border-cream-line bg-cream-soft px-2.5 py-2 text-[12.5px] text-ink-soft';
  const loading = studentsQuery.isLoading;
  const isEmpty = !loading && students.length === 0;

  return (
    <>
      <AdminHeader title="الطلاب" crumb="إدارة الطلاب ← السجل" />

      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <input
                className={`${selectCls} min-w-[180px] flex-1`}
                placeholder="بحث بالاسم، الرقم المدني، أو رقم الملف…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select className={selectCls} value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
                <option value="">كل الصفوف</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
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
                <Icon name="fa-solid fa-plus" className="text-[12px]" /> إضافة طالب
              </button>
            ) : null}
          </div>

          {loading ? <TableSkeleton cols={9} /> : null}

          {isEmpty ? (
            <EmptyState
              icon="fa-solid fa-graduation-cap"
              title="لا يوجد طلاب"
              body="ابدأ بإضافة طلاب جدد وربطهم بولي أمر وصف دراسي."
              primary={canManage ? { label: 'إضافة طالب', onClick: openCreate } : undefined}
            />
          ) : null}

          {!loading && !isEmpty ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {[
                      'رقم الملف',
                      'الاسم',
                      'الرقم المدني',
                      'الجنس',
                      'الصف',
                      'ولي الأمر',
                      'الهاتف',
                      'الحالة',
                      'التسجيلات',
                      ...(canManage ? [''] : []),
                    ].map((c, i) => (
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
                  {students.map((student) => (
                    <tr key={student.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                      <td className="font-latin whitespace-nowrap px-4 py-3 text-[12.5px] font-bold text-navy">
                        {student.file_number}
                      </td>
                      <td className="px-4 py-3 text-[13.5px] font-bold text-ink">{student.full_name}</td>
                      <td className="font-latin whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {student.civil_id || '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {genderLabel(student.gender)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {student.current_grade?.name ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {student.guardian?.full_name ?? '—'}
                      </td>
                      <td className="font-latin whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {student.phone || student.guardian?.phone || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {student.status ? <StatusBadge status={student.status} /> : '—'}
                      </td>
                      <td className="font-latin px-4 py-3 text-[13px] text-ink-soft">
                        {student.enrollments_count ?? 0}
                      </td>
                      {canManage ? (
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              aria-label="تعديل"
                              onClick={() => openEdit(student)}
                              className="h-[31px] w-[31px] rounded-[9px] border border-cream-line bg-white text-ink-soft"
                            >
                              <Icon name="fa-solid fa-pen" className="text-[11px]" />
                            </button>
                            <button
                              type="button"
                              aria-label="حذف"
                              onClick={() => setDeleteTarget(student)}
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
        wide
        onClose={() => {
          if (!saveMutation.isPending) {
            setModalOpen(false);
            setEditing(null);
          }
        }}
        title={editing ? 'تعديل طالب' : 'إضافة طالب'}
        eyebrow="STUDENT"
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
                if (validateForm()) saveMutation.mutate();
              }}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy"
            >
              {saveMutation.isPending ? 'جاري الحفظ…' : 'حفظ'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {editing ? (
            <div className="sm:col-span-2">
              <label className={formLabelClass}>رقم الملف</label>
              <input className={`${formFieldClass} font-latin bg-cream-soft`} value={editing.file_number} readOnly />
            </div>
          ) : null}

          <div className="sm:col-span-2">
            <label className={formLabelClass}>الاسم الكامل</label>
            <input
              className={formFieldClass}
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            />
          </div>

          <div>
            <label className={formLabelClass}>الجنس</label>
            <select
              className={formFieldClass}
              value={form.gender}
              onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as Gender }))}
            >
              {GENDERS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={formLabelClass}>الحالة</label>
            <select
              className={formFieldClass}
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as StudentStatus }))}
            >
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={formLabelClass}>الرقم المدني</label>
            <input
              className={`${formFieldClass} font-latin`}
              value={form.civil_id}
              onChange={(e) => setForm((f) => ({ ...f, civil_id: e.target.value }))}
            />
          </div>

          <div>
            <label className={formLabelClass}>تاريخ الميلاد</label>
            <input
              type="date"
              className={`${formFieldClass} font-latin`}
              value={form.date_of_birth}
              onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))}
            />
          </div>

          <div>
            <label className={formLabelClass}>الجنسية</label>
            <input
              className={formFieldClass}
              value={form.nationality}
              onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))}
              placeholder="الكويت"
            />
          </div>

          <div>
            <label className={formLabelClass}>هاتف التواصل *</label>
            <input
              className={`${formFieldClass} font-latin`}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>

          <div>
            <label className={formLabelClass}>هاتف إضافي (اختياري)</label>
            <input
              className={`${formFieldClass} font-latin`}
              value={form.phone_secondary}
              onChange={(e) => setForm((f) => ({ ...f, phone_secondary: e.target.value }))}
            />
          </div>

          <div>
            <label className={formLabelClass}>المرحلة / الصف *</label>
            <select
              className={formFieldClass}
              value={form.current_grade_id}
              onChange={(e) => setForm((f) => ({ ...f, current_grade_id: e.target.value }))}
            >
              <option value="">اختر المرحلة</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={formLabelClass}>المدرسة *</label>
            <SchoolSelect
              value={form.previous_school}
              onChange={(previous_school) => setForm((f) => ({ ...f, previous_school }))}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={formLabelClass}>العنوان</label>
            <input
              className={formFieldClass}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={formLabelClass}>ملاحظات</label>
            <textarea
              className={`${formFieldClass} min-h-[72px] resize-y`}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          {!editing && canViewGuardians ? (
            <div className="sm:col-span-2 rounded-xl border border-cream-line2 bg-cream-soft/60 p-4">
              <div className="mb-3 text-[13px] font-bold text-navy">ولي الأمر</div>
              <div className="mb-3 flex flex-wrap gap-2">
                {(
                  [
                    { id: 'new', label: 'ولي أمر جديد' },
                    { id: 'existing', label: 'ولي أمر موجود' },
                    { id: 'none', label: 'بدون ولي أمر' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, guardianMode: opt.id }))}
                    className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                      form.guardianMode === opt.id
                        ? 'bg-navy text-white'
                        : 'border border-cream-line2 bg-white text-ink-soft'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {form.guardianMode === 'existing' ? (
                <div>
                  <label className={formLabelClass}>اختر ولي الأمر</label>
                  <select
                    className={formFieldClass}
                    value={form.guardian_id}
                    onChange={(e) => setForm((f) => ({ ...f, guardian_id: e.target.value }))}
                  >
                    <option value="">اختر…</option>
                    {guardians.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.full_name} — {g.phone}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {form.guardianMode === 'new' ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={formLabelClass}>اسم ولي الأمر</label>
                    <input
                      className={formFieldClass}
                      value={form.guardian.full_name}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          guardian: { ...f.guardian, full_name: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className={formLabelClass}>الهاتف</label>
                    <input
                      className={`${formFieldClass} font-latin`}
                      value={form.guardian.phone}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          guardian: { ...f.guardian, phone: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className={formLabelClass}>صلة القرابة</label>
                    <select
                      className={formFieldClass}
                      value={form.guardian.relationship}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          guardian: { ...f.guardian, relationship: e.target.value as GuardianRelationship },
                        }))
                      }
                    >
                      {RELATIONSHIPS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={formLabelClass}>الرقم المدني</label>
                    <input
                      className={`${formFieldClass} font-latin`}
                      value={form.guardian.civil_id}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          guardian: { ...f.guardian, civil_id: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className={formLabelClass}>هاتف إضافي</label>
                    <input
                      className={`${formFieldClass} font-latin`}
                      value={form.guardian.phone_secondary}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          guardian: { ...f.guardian, phone_secondary: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={formLabelClass}>البريد الإلكتروني</label>
                    <input
                      type="email"
                      className={`${formFieldClass} font-latin`}
                      value={form.guardian.email}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          guardian: { ...f.guardian, email: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={formLabelClass}>عنوان ولي الأمر</label>
                    <input
                      className={formFieldClass}
                      value={form.guardian.address}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          guardian: { ...f.guardian, address: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {editing && canViewGuardians ? (
            <div className="sm:col-span-2">
              <label className={formLabelClass}>ولي الأمر</label>
              <select
                className={formFieldClass}
                value={form.guardian_id}
                onChange={(e) => setForm((f) => ({ ...f, guardian_id: e.target.value }))}
              >
                <option value="">بدون ولي أمر</option>
                {guardians.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.full_name} — {g.phone}
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
        title="حذف الطالب؟"
        body={`سيتم حذف «${deleteTarget?.full_name ?? ''}» (${deleteTarget?.file_number ?? ''}).`}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  );
}
