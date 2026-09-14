import type {
  Gender,
  GuardianRelationship,
  StudentStatus,
} from '@/lib/api-client';

export type GuardianFormState = {
  full_name: string;
  phone: string;
  relationship: GuardianRelationship;
  civil_id: string;
  phone_secondary: string;
  email: string;
  address: string;
};

export type StudentFormState = {
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
  guardianMode: 'new' | 'existing';
  guardian_id: string;
  guardian: GuardianFormState;
};

export const GENDERS: { id: Gender; label: string }[] = [
  { id: 'male', label: 'ذكر' },
  { id: 'female', label: 'أنثى' },
];

export const STATUSES: { id: StudentStatus; label: string }[] = [
  { id: 'active', label: 'نشط' },
  { id: 'inactive', label: 'غير نشط' },
  { id: 'graduated', label: 'متخرج' },
];

export const RELATIONSHIPS: GuardianRelationship[] = ['أب', 'أم', 'ولي أمر آخر'];

export const emptyGuardian: GuardianFormState = {
  full_name: '',
  phone: '',
  relationship: 'أب',
  civil_id: '',
  phone_secondary: '',
  email: '',
  address: '',
};

export const emptyStudentForm: StudentFormState = {
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
  guardianMode: 'new',
  guardian_id: '',
  guardian: emptyGuardian,
};

export function genderLabel(g?: Gender | null) {
  return GENDERS.find((x) => x.id === g)?.label ?? '—';
}

/** يحوّل أي إدخال إلى +965XXXXXXXX أو فارغ */
export function normalizeKuwaitPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('965')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  digits = digits.slice(0, 8);
  return digits ? `+965${digits}` : '';
}

export function kuwaitLocalDigits(full: string): string {
  return normalizeKuwaitPhone(full).replace(/^\+965/, '');
}

/** تاريخ ميلاد منطقي لطالب: ليس مستقبلاً، وليس أقدم من 100 سنة */
export function validateDateOfBirth(value: string): string | null {
  if (!value.trim()) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return 'تاريخ الميلاد غير صالح';

  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return 'تاريخ الميلاد غير صالح';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date >= today) return 'تاريخ الميلاد لا يمكن أن يكون اليوم أو في المستقبل';

  const min = new Date(today);
  min.setFullYear(min.getFullYear() - 100);
  if (date < min) return 'تاريخ الميلاد غير منطقي (أقدم من 100 سنة)';

  return null;
}

export function dobInputBounds() {
  const today = new Date();
  const max = new Date(today);
  max.setDate(max.getDate() - 1);
  const min = new Date(today);
  min.setFullYear(min.getFullYear() - 100);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { min: iso(min), max: iso(max) };
}

export function buildCreatePayload(form: StudentFormState): Record<string, unknown> {
  const contactPhone =
    form.guardianMode === 'new'
      ? normalizeKuwaitPhone(form.guardian.phone) || form.guardian.phone.trim()
      : form.phone.trim();

  const payload: Record<string, unknown> = {
    full_name: form.full_name.trim(),
    gender: form.gender,
    civil_id: form.civil_id.trim() || null,
    date_of_birth: form.date_of_birth || null,
    phone: contactPhone || null,
    phone_secondary: form.phone_secondary.trim()
      ? normalizeKuwaitPhone(form.phone_secondary) || form.phone_secondary.trim()
      : null,
    address: form.address.trim() || null,
    previous_school: form.previous_school.trim() || null,
    current_grade_id: form.current_grade_id ? Number(form.current_grade_id) : null,
    status: form.status,
    notes: form.notes.trim() || null,
  };

  if (form.guardianMode === 'existing' && form.guardian_id) {
    payload.guardian_id = Number(form.guardian_id);
  } else if (form.guardianMode === 'new') {
    payload.guardian = {
      full_name: form.guardian.full_name.trim(),
      phone: normalizeKuwaitPhone(form.guardian.phone) || form.guardian.phone.trim(),
      relationship: form.guardian.relationship,
      civil_id: form.guardian.civil_id.trim() || null,
      phone_secondary: form.guardian.phone_secondary.trim()
        ? normalizeKuwaitPhone(form.guardian.phone_secondary) || form.guardian.phone_secondary.trim()
        : null,
      email: form.guardian.email.trim() || null,
      address: form.guardian.address.trim() || null,
    };
  }

  return payload;
}

export function buildUpdatePayload(form: StudentFormState): Record<string, unknown> {
  return {
    full_name: form.full_name.trim(),
    gender: form.gender,
    civil_id: form.civil_id.trim() || null,
    date_of_birth: form.date_of_birth || null,
    // الهاتف يُزامَن من ولي الأمر في الـ backend
    phone: form.phone.trim() || null,
    phone_secondary: form.phone_secondary.trim()
      ? normalizeKuwaitPhone(form.phone_secondary) || form.phone_secondary.trim()
      : null,
    address: form.address.trim() || null,
    previous_school: form.previous_school.trim() || null,
    current_grade_id: form.current_grade_id ? Number(form.current_grade_id) : null,
    status: form.status,
    notes: form.notes.trim() || null,
    guardian_id: form.guardian_id ? Number(form.guardian_id) : null,
  };
}

export function validateCreateForm(form: StudentFormState): string | null {
  if (!form.full_name.trim()) return 'اسم الطالب مطلوب';
  if (!form.current_grade_id) return 'المرحلة مطلوبة';
  if (!form.previous_school.trim()) return 'المدرسة مطلوبة';
  const dobError = validateDateOfBirth(form.date_of_birth);
  if (dobError) return dobError;
  if (form.phone_secondary.trim()) {
    const local = kuwaitLocalDigits(form.phone_secondary);
    if (local.length > 0 && local.length < 8) return 'رقم الهاتف الإضافي غير مكتمل';
  }
  if (form.guardianMode === 'existing' && !form.guardian_id) {
    return 'اختر ولي الأمر أو غيّر إلى ولي أمر جديد';
  }
  if (form.guardianMode === 'new') {
    if (!form.guardian.full_name.trim()) return 'اسم ولي الأمر مطلوب';
    if (!form.guardian.phone.trim()) return 'هاتف ولي الأمر مطلوب';
    const gLocal = kuwaitLocalDigits(form.guardian.phone);
    if (gLocal.length > 0 && gLocal.length < 8) return 'هاتف ولي الأمر غير مكتمل';
  }
  return null;
}

export function validateUpdateForm(form: StudentFormState): string | null {
  if (!form.full_name.trim()) return 'اسم الطالب مطلوب';
  if (!form.current_grade_id) return 'المرحلة مطلوبة';
  if (!form.previous_school.trim()) return 'المدرسة مطلوبة';
  const dobError = validateDateOfBirth(form.date_of_birth);
  if (dobError) return dobError;
  if (form.phone_secondary.trim()) {
    const local = kuwaitLocalDigits(form.phone_secondary);
    if (local.length > 0 && local.length < 8) return 'رقم الهاتف الإضافي غير مكتمل';
  }
  return null;
}
