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
  formatKwd,
  qs,
  type CompensationComponentType,
  type Paginated,
  type StaffCompensationComponent,
  type Subject,
  type TeacherUser,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

const TYPE_OPTIONS: { id: CompensationComponentType; label: string }[] = [
  { id: 'base_salary', label: 'راتب أساسي' },
  { id: 'per_session_rate', label: 'سعر حصة' },
  { id: 'fixed_incentive', label: 'حافز ثابت' },
  { id: 'recurring_bonus', label: 'مكافأة متكررة' },
];

type CompForm = {
  component_type: CompensationComponentType;
  amount: string;
  effective_from: string;
  effective_to: string;
  is_active: boolean;
};

type TeacherForm = {
  name: string;
  email: string;
  phone: string;
  password: string;
  subject_ids: number[];
};

const emptyForm = (): CompForm => ({
  component_type: 'base_salary',
  amount: '',
  effective_from: new Date().toISOString().slice(0, 10),
  effective_to: '',
  is_active: true,
});

function generatePassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => chars[n % chars.length]).join('');
}

const emptyTeacherForm = (): TeacherForm => ({
  name: '',
  email: '',
  phone: '',
  password: generatePassword(),
  subject_ids: [],
});

function specialtyNames(t: TeacherUser): string {
  const subjects = t.staff_profile?.qualifications?.subjects ?? [];
  if (subjects.length === 0) return 'بدون تخصص';
  return subjects.map((s) => s.name).join('، ');
}

/** تطبيع رقم كويتي/دولي لـ WhatsApp */
function toWhatsAppNumber(phone: string): string | null {
  let digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return null;
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `965${digits.slice(1)}`;
  if (digits.length === 8) digits = `965${digits}`;
  return digits;
}

function openTeacherWhatsApp(params: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): boolean {
  const wa = toWhatsAppNumber(params.phone);
  if (!wa) {
    toast.error('أدخل رقم هاتف صحيح لإرسال واتساب');
    return false;
  }

  const text = [
    'مرحباً',
    '',
    'بيانات دخول بوابة المعلم:',
    `الاسم: ${params.name}`,
    `البريد: ${params.email}`,
    `كلمة المرور: ${params.password}`,
    '',
    'يرجى تغيير كلمة المرور بعد أول دخول.',
  ].join('\n');

  window.open(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  return true;
}

function invalidateTeacherQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['teachers-list'] });
  qc.invalidateQueries({ queryKey: ['users'] });
  qc.invalidateQueries({ queryKey: ['teachers'] });
  qc.invalidateQueries({ queryKey: ['bulk-import-teachers'] });
}

export function TeachersPage() {
  const canView = useAuthStore((s) => s.hasPermission('teachers.view'));
  const canManage = useAuthStore((s) => s.hasPermission('teachers.manage'));
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeacherUser | null>(null);
  const [teacherForm, setTeacherForm] = useState<TeacherForm>(emptyTeacherForm());
  const [sendWhatsAppAfterSave, setSendWhatsAppAfterSave] = useState(true);

  const [specialtyTarget, setSpecialtyTarget] = useState<TeacherUser | null>(null);
  const [specialtyIds, setSpecialtyIds] = useState<number[]>([]);
  const [compTarget, setCompTarget] = useState<TeacherUser | null>(null);
  const [compForm, setCompForm] = useState<CompForm>(emptyForm());
  const [deleteCompId, setDeleteCompId] = useState<number | null>(null);
  const [deleteTeacher, setDeleteTeacher] = useState<TeacherUser | null>(null);

  const teachersQuery = useQuery({
    queryKey: ['teachers-list'],
    queryFn: () => apiClient<Paginated<TeacherUser>>(`/teachers${qs({ per_page: 100 })}`),
    enabled: canView,
  });

  const subjectsQuery = useQuery({
    queryKey: ['subjects-all-teachers'],
    queryFn: () => apiClient<Paginated<Subject>>(`/subjects${qs({ per_page: 200 })}`),
    enabled: canManage && (modalOpen || Boolean(specialtyTarget)),
  });

  const allSubjects = subjectsQuery.data?.data ?? [];

  const componentsQuery = useQuery({
    queryKey: ['compensation-components', compTarget?.id],
    queryFn: () =>
      apiClient<{ data: StaffCompensationComponent[] } | StaffCompensationComponent[]>(
        `/users/${compTarget!.id}/compensation-components`,
      ),
    enabled: Boolean(compTarget) && canManage,
  });

  const components: StaffCompensationComponent[] = Array.isArray(componentsQuery.data)
    ? componentsQuery.data
    : (componentsQuery.data?.data ?? []);

  const teachers = teachersQuery.data?.data ?? [];

  const saveTeacherMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        name: teacherForm.name.trim(),
        email: teacherForm.email.trim(),
        phone: teacherForm.phone.trim() || null,
        subject_ids: teacherForm.subject_ids,
      };
      if (teacherForm.password.trim()) {
        payload.password = teacherForm.password.trim();
      }

      if (editing) {
        return apiClient<TeacherUser>(`/teachers/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }

      return apiClient<TeacherUser>('/teachers', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      const password = teacherForm.password.trim();
      const phone = teacherForm.phone.trim();
      const name = teacherForm.name.trim();
      const email = teacherForm.email.trim();

      toast.success(editing ? 'تم تحديث المعلم' : 'تم إضافة المعلم');
      setModalOpen(false);
      setEditing(null);

      if (sendWhatsAppAfterSave && password && phone) {
        openTeacherWhatsApp({ name, email, phone, password });
      } else if (sendWhatsAppAfterSave && !phone) {
        toast.message('حُفظ المعلم — أضف رقم هاتف لإرسال واتساب');
      }

      setTeacherForm(emptyTeacherForm());
      invalidateTeacherQueries(qc);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const whatsappMutation = useMutation({
    mutationFn: async (teacher: TeacherUser) => {
      if (!teacher.phone?.trim()) {
        throw new Error('لا يوجد رقم هاتف لهذا المعلم');
      }
      const password = generatePassword();
      await apiClient(`/teachers/${teacher.id}`, {
        method: 'PUT',
        body: JSON.stringify({ password }),
      });
      return { teacher, password };
    },
    onSuccess: ({ teacher, password }) => {
      const ok = openTeacherWhatsApp({
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone!,
        password,
      });
      if (ok) toast.success('تم توليد كلمة مرور جديدة وفتح واتساب');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteTeacherMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/teachers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم حذف المعلم');
      setDeleteTeacher(null);
      invalidateTeacherQueries(qc);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const specialtyMutation = useMutation({
    mutationFn: () => {
      if (!specialtyTarget) throw new Error('لا معلم محدد');
      return apiClient(`/teachers/${specialtyTarget.id}/subjects`, {
        method: 'PUT',
        body: JSON.stringify({ subject_ids: specialtyIds, grade_ids: [] }),
      });
    },
    onSuccess: () => {
      toast.success('تم تحديث التخصص');
      setSpecialtyTarget(null);
      invalidateTeacherQueries(qc);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addCompMutation = useMutation({
    mutationFn: () => {
      if (!compTarget) throw new Error('لا معلم محدد');
      return apiClient(`/users/${compTarget.id}/compensation-components`, {
        method: 'POST',
        body: JSON.stringify({
          component_type: compForm.component_type,
          amount: Number(compForm.amount),
          effective_from: compForm.effective_from,
          effective_to: compForm.effective_to || null,
          is_active: compForm.is_active,
        }),
      });
    },
    onSuccess: () => {
      toast.success('تمت إضافة المكوّن');
      setCompForm(emptyForm());
      qc.invalidateQueries({ queryKey: ['compensation-components', compTarget?.id] });
      qc.invalidateQueries({ queryKey: ['teachers-list'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteCompMutation = useMutation({
    mutationFn: (id: number) =>
      apiClient(`/users/${compTarget!.id}/compensation-components/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم حذف المكوّن');
      setDeleteCompId(null);
      qc.invalidateQueries({ queryKey: ['compensation-components', compTarget?.id] });
      qc.invalidateQueries({ queryKey: ['teachers-list'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreate() {
    setEditing(null);
    setTeacherForm(emptyTeacherForm());
    setSendWhatsAppAfterSave(true);
    setModalOpen(true);
  }

  function openEdit(teacher: TeacherUser) {
    setEditing(teacher);
    setTeacherForm({
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone ?? '',
      password: '',
      subject_ids: (teacher.staff_profile?.qualifications?.subjects ?? []).map((s) => s.id),
    });
    setSendWhatsAppAfterSave(false);
    setModalOpen(true);
  }

  function toggleSubject(id: number, forSpecialty = false) {
    if (forSpecialty) {
      setSpecialtyIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
      return;
    }
    setTeacherForm((f) => ({
      ...f,
      subject_ids: f.subject_ids.includes(id)
        ? f.subject_ids.filter((x) => x !== id)
        : [...f.subject_ids, id],
    }));
  }

  function activeSummary(t: TeacherUser) {
    const list = (t.compensation_components ?? []).filter((c) => c.is_active);
    if (list.length === 0) return 'غير محدد';
    return list.map((c) => formatKwd(c.amount)).join(' + ');
  }

  const canSubmit =
    teacherForm.name.trim() &&
    teacherForm.email.trim() &&
    teacherForm.subject_ids.length > 0 &&
    (editing ? true : teacherForm.password.length >= 8) &&
    (editing && teacherForm.password ? teacherForm.password.length >= 8 : true);

  if (!canView) {
    return (
      <>
        <AdminHeader title="المعلمون" crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">
          ليس لديك صلاحية الوصول لهذه الصفحة.
        </AdminContent>
      </>
    );
  }

  const loading = teachersQuery.isLoading;
  const isEmpty = !loading && teachers.length === 0;

  return (
    <>
      <AdminHeader title="المعلمون" crumb="الشؤون الأكاديمية ← المعلمون" />
      <AdminContent>
        {canManage ? (
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2.5 text-[13px] font-extrabold text-navy"
            >
              <Icon name="fa-solid fa-plus" className="text-[12px]" /> إضافة معلم
            </button>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          {loading ? <TableSkeleton cols={5} /> : null}
          {isEmpty ? (
            <EmptyState
              icon="fa-solid fa-chalkboard-user"
              title="لا يوجد معلمون"
              body="أضف معلمًا جديدًا ليظهر في قوائم الجداول والحصص."
              primary={canManage ? { label: 'إضافة معلم', onClick: openCreate } : undefined}
            />
          ) : null}
          {!loading && !isEmpty ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {['الاسم', 'الهاتف', 'التخصص', 'عدد الشعب', ...(canManage ? ['إجراءات'] : [])].map(
                      (c) => (
                        <th
                          key={c}
                          className="whitespace-nowrap px-4 py-3 text-right text-[11.5px] font-bold text-ink-dim"
                        >
                          {c}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((t) => (
                    <tr key={t.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                      <td className="px-4 py-3">
                        <div className="text-[13.5px] font-bold text-ink">{t.name}</div>
                        <div className="font-latin mt-0.5 text-[11.5px] text-ink-dim">{t.email}</div>
                      </td>
                      <td className="font-latin px-4 py-3 text-[12.5px] text-ink-soft">
                        {t.phone || '—'}
                      </td>
                      <td className="px-4 py-3 text-[12.5px] text-ink-soft">{specialtyNames(t)}</td>
                      <td className="font-latin px-4 py-3 text-[13px] text-ink-soft">
                        {t.taught_class_offerings_count ?? t.taught_groups_count ?? 0}
                      </td>
                      {canManage ? (
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              title="تعديل"
                              onClick={() => openEdit(t)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cream-line2 bg-white text-navy"
                            >
                              <Icon name="fa-solid fa-pen" className="text-[11px]" />
                            </button>
                            <button
                              type="button"
                              title="إرسال بيانات الدخول واتساب"
                              disabled={whatsappMutation.isPending || !t.phone}
                              onClick={() => whatsappMutation.mutate(t)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#d4edda] bg-[#e9f3ec] text-[#2e7d4f] disabled:opacity-40"
                            >
                              <Icon name="fa-brands fa-whatsapp" className="text-[13px]" />
                            </button>
                            <button
                              type="button"
                              title="التخصص"
                              onClick={() => {
                                setSpecialtyTarget(t);
                                setSpecialtyIds(
                                  (t.staff_profile?.qualifications?.subjects ?? []).map((s) => s.id),
                                );
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cream-line2 bg-white text-navy"
                            >
                              <Icon name="fa-solid fa-book" className="text-[11px]" />
                            </button>
                            <button
                              type="button"
                              title="مكوّنات الأجر"
                              onClick={() => {
                                setCompTarget(t);
                                setCompForm(emptyForm());
                              }}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cream-line2 bg-white text-navy"
                            >
                              <Icon name="fa-solid fa-coins" className="text-[11px]" />
                            </button>
                            <button
                              type="button"
                              title="حذف"
                              onClick={() => setDeleteTeacher(t)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#f2dede] bg-white text-[#a34b4b]"
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
          if (!saveTeacherMutation.isPending) {
            setModalOpen(false);
            setEditing(null);
          }
        }}
        title={editing ? 'تعديل معلم' : 'إضافة معلم'}
        eyebrow="TEACHER"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                setEditing(null);
              }}
              className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={saveTeacherMutation.isPending || !canSubmit}
              onClick={() => saveTeacherMutation.mutate()}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy disabled:opacity-70"
            >
              {saveTeacherMutation.isPending ? 'جاري الحفظ…' : 'حفظ'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className={formLabelClass}>الاسم</label>
            <input
              className={formFieldClass}
              value={teacherForm.name}
              onChange={(e) => setTeacherForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className={formLabelClass}>البريد</label>
            <input
              type="email"
              dir="ltr"
              className={`${formFieldClass} font-latin`}
              value={teacherForm.email}
              onChange={(e) => setTeacherForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <label className={formLabelClass}>الهاتف (لواتساب)</label>
            <input
              dir="ltr"
              className={`${formFieldClass} font-latin`}
              placeholder="5xxxxxxx أو 9655xxxxxxx"
              value={teacherForm.phone}
              onChange={(e) => setTeacherForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div>
            <label className={formLabelClass}>
              كلمة المرور{editing ? ' (اتركها فارغة للإبقاء)' : ''}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                dir="ltr"
                className={`${formFieldClass} font-latin`}
                value={teacherForm.password}
                onChange={(e) => setTeacherForm((f) => ({ ...f, password: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => setTeacherForm((f) => ({ ...f, password: generatePassword() }))}
                className="shrink-0 rounded-xl border border-cream-line2 bg-white px-3 text-[12px] font-bold text-navy"
              >
                توليد
              </button>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-ink-soft">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-gold"
              checked={sendWhatsAppAfterSave}
              onChange={(e) => setSendWhatsAppAfterSave(e.target.checked)}
            />
            إرسال بيانات الدخول واتساب بعد الحفظ
          </label>
          <div>
            <label className={formLabelClass}>التخصص (المواد)</label>
            <div className="max-h-[160px] space-y-1 overflow-y-auto rounded-xl border border-cream-line2 bg-white p-2">
              {allSubjects.length === 0 ? (
                <p className="px-2 py-3 text-[12px] text-ink-dim">لا مواد بعد — أضف مواد أولًا.</p>
              ) : (
                allSubjects.map((s) => {
                  const active = teacherForm.subject_ids.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSubject(s.id)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-right text-[12.5px] ${
                        active
                          ? 'bg-cream-soft font-bold text-navy'
                          : 'text-ink-soft hover:bg-cream-soft/60'
                      }`}
                    >
                      <span>{s.name}</span>
                      {active ? (
                        <Icon name="fa-solid fa-check" className="text-[11px] text-gold" />
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </FormModal>

      <FormModal
        open={Boolean(specialtyTarget)}
        onClose={() => {
          if (!specialtyMutation.isPending) setSpecialtyTarget(null);
        }}
        title={`تخصص — ${specialtyTarget?.name ?? ''}`}
        eyebrow="SPECIALTY"
        footer={
          <>
            <button
              type="button"
              onClick={() => setSpecialtyTarget(null)}
              className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={specialtyMutation.isPending || specialtyIds.length === 0}
              onClick={() => specialtyMutation.mutate()}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy disabled:opacity-70"
            >
              حفظ التخصص
            </button>
          </>
        }
      >
        <div className="max-h-[240px] space-y-1 overflow-y-auto rounded-xl border border-cream-line2 bg-white p-2">
          {allSubjects.map((s) => {
            const active = specialtyIds.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSubject(s.id, true)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-right text-[12.5px] ${
                  active ? 'bg-cream-soft font-bold text-navy' : 'text-ink-soft hover:bg-cream-soft/60'
                }`}
              >
                <span>{s.name}</span>
                {active ? <Icon name="fa-solid fa-check" className="text-[11px] text-gold" /> : null}
              </button>
            );
          })}
        </div>
      </FormModal>

      <FormModal
        open={Boolean(compTarget)}
        onClose={() => {
          if (!addCompMutation.isPending) setCompTarget(null);
        }}
        title="مكوّنات الأجر"
        eyebrow="COMPENSATION"
        extraWide
        footer={
          <button
            type="button"
            onClick={() => setCompTarget(null)}
            className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
          >
            إغلاق
          </button>
        }
      >
        <p className="mb-3 text-[13px] text-ink-soft">
          المعلم: <span className="font-bold text-ink">{compTarget?.name}</span>
          {compTarget ? (
            <span className="ms-2 text-[12px] text-ink-dim">({activeSummary(compTarget)})</span>
          ) : null}
        </p>

        {componentsQuery.isLoading ? <TableSkeleton rows={3} /> : null}
        {components.length > 0 ? (
          <div className="mb-4 overflow-x-auto rounded-xl border border-cream-line">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="bg-cream-soft">
                  {['النوع', 'المبلغ', 'من', 'إلى', 'نشط', ''].map((c) => (
                    <th key={c} className="px-3 py-2 text-right text-[11px] font-bold text-ink-dim">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {components.map((c) => (
                  <tr key={c.id} className="border-t border-[#f4f1ea]">
                    <td className="px-3 py-2">
                      <StatusBadge status={c.component_type} />
                    </td>
                    <td className="font-latin px-3 py-2 text-[12.5px] font-bold">
                      {formatKwd(c.amount)}
                    </td>
                    <td className="font-latin px-3 py-2 text-[12px]">{c.effective_from}</td>
                    <td className="font-latin px-3 py-2 text-[12px]">{c.effective_to ?? '—'}</td>
                    <td className="px-3 py-2 text-[12px]">{c.is_active ? 'نعم' : 'لا'}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setDeleteCompId(c.id)}
                        className="h-[28px] w-[28px] rounded-lg border border-[#f2dede] text-[#a34b4b]"
                      >
                        <Icon name="fa-solid fa-trash" className="text-[10px]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="rounded-xl border border-cream-line bg-[#fbfaf7] p-3.5">
          <h4 className="mb-2 text-[13px] font-extrabold text-navy">إضافة مكوّن</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={formLabelClass}>النوع</label>
              <select
                className={formFieldClass}
                value={compForm.component_type}
                onChange={(e) =>
                  setCompForm((f) => ({
                    ...f,
                    component_type: e.target.value as CompensationComponentType,
                  }))
                }
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={formLabelClass}>المبلغ (د.ك)</label>
              <input
                type="number"
                min={0}
                step="0.001"
                className={`${formFieldClass} font-latin`}
                value={compForm.amount}
                onChange={(e) => setCompForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <label className={formLabelClass}>ساري من</label>
              <input
                type="date"
                className={`${formFieldClass} font-latin`}
                value={compForm.effective_from}
                onChange={(e) => setCompForm((f) => ({ ...f, effective_from: e.target.value }))}
              />
            </div>
            <div>
              <label className={formLabelClass}>ساري إلى (اختياري)</label>
              <input
                type="date"
                className={`${formFieldClass} font-latin`}
                value={compForm.effective_to}
                onChange={(e) => setCompForm((f) => ({ ...f, effective_to: e.target.value }))}
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              disabled={
                addCompMutation.isPending ||
                !compForm.amount ||
                Number.isNaN(Number(compForm.amount)) ||
                !compForm.effective_from
              }
              onClick={() => addCompMutation.mutate()}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-[13px] font-extrabold text-navy disabled:opacity-70"
            >
              إضافة مكوّن
            </button>
          </div>
        </div>
      </FormModal>

      <ConfirmDialog
        open={deleteCompId != null}
        onClose={() => {
          if (!deleteCompMutation.isPending) setDeleteCompId(null);
        }}
        onConfirm={() => {
          if (deleteCompId != null) deleteCompMutation.mutate(deleteCompId);
        }}
        title="حذف المكوّن؟"
        body="سيتم حذف مكوّن الأجر."
        loading={deleteCompMutation.isPending}
      />

      <ConfirmDialog
        open={Boolean(deleteTeacher)}
        onClose={() => {
          if (!deleteTeacherMutation.isPending) setDeleteTeacher(null);
        }}
        onConfirm={() => {
          if (deleteTeacher) deleteTeacherMutation.mutate(deleteTeacher.id);
        }}
        title="حذف المعلم؟"
        body={`سيتم حذف ${deleteTeacher?.name ?? ''} من المستخدمين. لا يمكن الحذف إن كان مرتبطًا بشعب.`}
        loading={deleteTeacherMutation.isPending}
      />
    </>
  );
}
