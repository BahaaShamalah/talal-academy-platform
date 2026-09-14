'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { GuardianAutocomplete } from '@/components/student-files/guardian-autocomplete';
import { KuwaitPhoneInput } from '@/components/student-files/kuwait-phone-input';
import {
  GENDERS,
  RELATIONSHIPS,
  buildCreatePayload,
  dobInputBounds,
  emptyStudentForm,
  normalizeKuwaitPhone,
  validateCreateForm,
  validateDateOfBirth,
  type StudentFormState,
} from '@/components/student-files/student-shared';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { formFieldClass, formLabelClass } from '@/components/ui/form-modal';
import { Icon } from '@/components/ui/icon';
import { SchoolSelect } from '@/components/ui/school-select';
import { apiClient, qs, type Grade, type Paginated, type Student } from '@/lib/api-client';

export function CreateStudentPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<StudentFormState>(emptyStudentForm);
  const [guardianLabel, setGuardianLabel] = useState('');
  const dobBounds = dobInputBounds();

  const gradesQuery = useQuery({
    queryKey: ['grades-options'],
    queryFn: () =>
      apiClient<Paginated<Grade>>(`/grades${qs({ per_page: 100, include: 'educationalStage' })}`),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient<Student>('/students', {
        method: 'POST',
        body: JSON.stringify(buildCreatePayload(form)),
      }),
    onSuccess: (student) => {
      toast.success(`تم إنشاء الطالب بنجاح — رقم الملف ${student.file_number}`);
      router.push(`/dashboard/student-files/${student.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const grades = gradesQuery.data?.data ?? [];

  function nextStep() {
    if (!form.full_name.trim()) {
      toast.error('اسم الطالب مطلوب');
      return;
    }
    if (!form.current_grade_id) {
      toast.error('المرحلة مطلوبة');
      return;
    }
    if (!form.previous_school.trim()) {
      toast.error('المدرسة مطلوبة');
      return;
    }
    const dobError = validateDateOfBirth(form.date_of_birth);
    if (dobError) {
      toast.error(dobError);
      return;
    }
    setStep(2);
  }

  function submit() {
    const error = validateCreateForm(form);
    if (error) {
      toast.error(error);
      return;
    }
    createMutation.mutate();
  }

  return (
    <>
      <AdminHeader title="إضافة طالب جديد" crumb="ملفات الطلاب ← تسجيل جديد" />

      <AdminContent>
        <Link
          href="/dashboard/student-files"
          className="mb-4 inline-flex items-center gap-2 text-[13px] font-semibold text-ink-soft hover:text-navy"
        >
          <Icon name="fa-solid fa-arrow-right" className="text-[11px]" />
          العودة للقائمة
        </Link>

        <div className="mb-5 flex items-center gap-3">
          {([1, 2] as const).map((n) => (
            <div key={n} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold ${
                  step >= n ? 'bg-navy text-gold-soft' : 'border border-cream-line2 bg-white text-ink-dim'
                }`}
              >
                {n}
              </div>
              <span className={`text-[13px] font-semibold ${step >= n ? 'text-navy' : 'text-ink-dim'}`}>
                {n === 1 ? 'بيانات الطالب' : 'ولي الأمر'}
              </span>
              {n === 1 ? <div className="h-px flex-1 bg-cream-line2" /> : null}
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white p-5">
          {step === 1 ? (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={formLabelClass}>الاسم الكامل *</label>
                <input
                  className={formFieldClass}
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                />
              </div>
              <div>
                <label className={formLabelClass}>المرحلة *</label>
                <select
                  className={formFieldClass}
                  value={form.current_grade_id}
                  onChange={(e) => setForm((f) => ({ ...f, current_grade_id: e.target.value }))}
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
                  value={form.previous_school}
                  onChange={(previous_school) => setForm((f) => ({ ...f, previous_school }))}
                />
              </div>
              <div>
                <label className={formLabelClass}>تاريخ الميلاد</label>
                <input
                  type="date"
                  className={`${formFieldClass} font-latin`}
                  min={dobBounds.min}
                  max={dobBounds.max}
                  value={form.date_of_birth}
                  onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))}
                />
              </div>
              <div>
                <label className={formLabelClass}>الجنس *</label>
                <select
                  className={formFieldClass}
                  value={form.gender}
                  onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as typeof f.gender }))}
                >
                  {GENDERS.map((g) => (
                    <option key={g.id} value={g.id}>{g.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={formLabelClass}>الرقم المدني (اختياري)</label>
                <input
                  className={`${formFieldClass} font-latin`}
                  dir="ltr"
                  value={form.civil_id}
                  onChange={(e) => setForm((f) => ({ ...f, civil_id: e.target.value }))}
                />
              </div>
              <div>
                <label className={formLabelClass}>رقم هاتف إضافي (اختياري)</label>
                <KuwaitPhoneInput
                  value={form.phone_secondary}
                  onChange={(phone_secondary) => setForm((f) => ({ ...f, phone_secondary }))}
                />
              </div>
              <div className="sm:col-span-2 rounded-xl border border-[#eaf0f8] bg-[#f5f8fc] px-3.5 py-3 text-[12.5px] text-[#1c4b8f]">
                <Icon name="fa-solid fa-circle-info" className="me-1.5 text-[11px]" />
                هاتف التواصل للطالب سيُؤخذ تلقائيًا من هاتف ولي الأمر في الخطوة التالية.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: 'new', label: 'ولي أمر جديد' },
                    { id: 'existing', label: 'ربط بولي أمر موجود (أخ/أخت)' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, guardianMode: opt.id, guardian_id: '', phone: '' }))}
                    className={`rounded-full px-4 py-2 text-[13px] font-semibold ${
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
                <GuardianAutocomplete
                  selectedId={form.guardian_id}
                  selectedLabel={guardianLabel}
                  onSelect={(id, label, phone) => {
                    setForm((f) => ({
                      ...f,
                      guardian_id: id,
                      phone: phone ? normalizeKuwaitPhone(phone) || phone : '',
                    }));
                    setGuardianLabel(label);
                  }}
                />
              ) : (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={formLabelClass}>اسم ولي الأمر *</label>
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
                    <label className={formLabelClass}>صلة القرابة *</label>
                    <select
                      className={formFieldClass}
                      value={form.guardian.relationship}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          guardian: {
                            ...f.guardian,
                            relationship: e.target.value as typeof f.guardian.relationship,
                          },
                        }))
                      }
                    >
                      {RELATIONSHIPS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={formLabelClass}>الهاتف *</label>
                    <KuwaitPhoneInput
                      value={form.guardian.phone}
                      onChange={(phone) =>
                        setForm((f) => ({
                          ...f,
                          phone,
                          guardian: { ...f.guardian, phone },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className={formLabelClass}>الهاتف الثانوي</label>
                    <KuwaitPhoneInput
                      value={form.guardian.phone_secondary}
                      onChange={(phone_secondary) =>
                        setForm((f) => ({
                          ...f,
                          guardian: { ...f.guardian, phone_secondary },
                        }))
                      }
                    />
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
                    <label className={formLabelClass}>العنوان</label>
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
              )}
            </div>
          )}

          <div className="mt-6 flex justify-between gap-2 border-t border-[#f0ece1] pt-4">
            {step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
              >
                السابق
              </button>
            ) : (
              <span />
            )}
            {step === 1 ? (
              <button
                type="button"
                onClick={nextStep}
                className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy"
              >
                التالي: ولي الأمر
              </button>
            ) : (
              <button
                type="button"
                disabled={createMutation.isPending}
                onClick={submit}
                className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy disabled:opacity-70"
              >
                {createMutation.isPending ? 'جاري الحفظ…' : 'حفظ وإنشاء الملف'}
              </button>
            )}
          </div>
        </div>
      </AdminContent>
    </>
  );
}
