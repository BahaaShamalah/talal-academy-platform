/** Shared field styles for account forms */
export const accountField =
  'w-full rounded-xl border border-[#ece6d8] bg-white px-4 py-3 text-[14px] text-[#1c1a17] focus:border-gold focus:outline-none';

export const accountLabel = 'mb-1.5 block text-[13px] font-bold text-[#5c564c]';

export type Guardian = {
  id: number;
  full_name: string | null;
  phone: string;
  email: string | null;
  relationship?: string | null;
  address?: string | null;
  avatar_media_id?: number | null;
  avatar_url?: string | null;
};

export type Grade = {
  id: number;
  name: string;
  educational_stage_id?: number;
  educational_stage?: { id: number; name: string } | null;
};

export type InstallmentTemplate = {
  id: number;
  name: string;
  number_of_installments: number;
  split_percentages: number[];
  due_offset_days: number[];
};

export type InvoiceInstallment = {
  id: number;
  invoice_id: number;
  sequence: number;
  amount: string | number;
  due_date?: string | null;
  status?: 'pending' | 'paid' | null;
  is_overdue?: boolean;
  paid_at?: string | null;
};

export type Plan = {
  id: number;
  grade_id: number | null;
  educational_stage_id?: number | null;
  subject_id: number | null;
  subject_selection_count?: number | null;
  name: string;
  description: string | null;
  price: string | number;
  compare_at_price?: string | number | null;
  subject?: { id: number; name: string } | null;
  product_type?: {
    id: number;
    name_ar: string;
    subject_selection_mode?: 'all_subjects' | 'single_subject' | 'choose_subjects' | 'none' | string | null;
  } | null;
  duration_period?: { id: number; name: string } | null;
  installment_template_id?: number | null;
  installment_template?: InstallmentTemplate | null;
};

export type SubjectOption = {
  id: number;
  name: string;
  description?: string | null;
};

export type Subscription = {
  id: number;
  student_id: number;
  plan_id: number;
  invoice_id: number | null;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  plan?: {
    id: number;
    name: string;
    price?: string | number;
    compare_at_price?: string | number | null;
    duration_type?: string;
    duration_period_id?: number | null;
    subject?: { id: number; name: string } | null;
    product_type?: { id: number; name_ar: string } | null;
    duration_period?: { id: number; name: string } | null;
  } | null;
  selected_subjects?: {
    id: number;
    subject_id: number;
    subject?: { id: number; name: string } | null;
  }[];
  invoice?: {
    id: number;
    invoice_number: string;
    status: string;
    total?: string | number;
  } | null;
};

export type InvoiceItem = {
  id: number;
  description: string;
  unit_price: string | number;
  quantity: number;
  line_total: string | number;
};

export type Invoice = {
  id: number;
  invoice_number: string;
  student_id: number;
  status: string;
  can_pay_online?: boolean;
  has_installments?: boolean;
  subtotal: string | number;
  discount_amount: string | number;
  total: string | number;
  payment_method?: string | null;
  paid_at: string | null;
  created_at?: string;
  student?: { id: number; full_name: string; file_number: string } | null;
  items?: InvoiceItem[];
  installments?: InvoiceInstallment[];
};

export type Enrollment = {
  id: number;
  status?: string | { value?: string } | null;
  class_offering?: {
    id: number;
    subject?: { id: number; name: string } | null;
    teacher?: { id: number; name: string } | null;
  } | null;
};

export type Student = {
  id: number;
  file_number: string;
  full_name: string;
  gender: string;
  date_of_birth: string | null;
  current_grade_id: number | null;
  current_grade?: Grade | null;
  plan_subscriptions?: Subscription[];
  invoices?: Invoice[];
  enrollments?: Enrollment[];
};

export function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as { data: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}

export function unwrapOne<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== 'object') return null;
  if ('data' in payload) return ((payload as { data: T }).data ?? null) as T | null;
  return payload as T;
}

/** Laravel validation / API error body → first human-readable message. */
export function apiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const body = payload as {
    message?: unknown;
    errors?: Record<string, string[] | string>;
  };
  if (typeof body.message === 'string' && body.message.trim() !== '') {
    return body.message;
  }
  if (body.errors && typeof body.errors === 'object') {
    for (const value of Object.values(body.errors)) {
      if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim() !== '') {
        return value[0];
      }
      if (typeof value === 'string' && value.trim() !== '') {
        return value;
      }
    }
  }
  return fallback;
}

export function hasActiveSubscription(student: Student): boolean {
  return (student.plan_subscriptions ?? []).some((s) => s.status === 'active');
}

export function subscriptionBadge(student: Student): { label: string; tone: 'ok' | 'warn' | 'muted' } {
  const subs = student.plan_subscriptions ?? [];
  if (subs.some((s) => s.status === 'active')) return { label: 'اشتراك نشط', tone: 'ok' };
  if (subs.some((s) => s.status === 'pending_payment')) return { label: 'بانتظار الدفع', tone: 'warn' };
  return { label: 'لا يوجد اشتراك', tone: 'muted' };
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    active: 'نشط',
    pending_payment: 'بانتظار الدفع',
    expired: 'منتهي',
    cancelled: 'ملغى',
    pending: 'معلّقة',
    paid: 'مدفوعة',
    frozen: 'مجمّد',
    cancelled_invoice: 'ملغاة',
    refunded: 'مسترجعة',
  };
  return map[status] ?? status;
}

export type PrivateLessonOffer = {
  id: number;
  grade_id: number;
  subject_id: number;
  teacher_id: number;
  duration_minutes: number;
  session_type: 'individual' | 'group';
  price: string | number;
  max_students: number | null;
  status: string;
  image_media_id?: number | null;
  image_url?: string | null;
  grade?: { id: number; name: string } | null;
  subject?: { id: number; name: string } | null;
  teacher?: { id: number; name: string } | null;
};

export type PrivateLessonSlot = {
  id: number;
  private_lesson_offer_id: number;
  day_of_week: number | null;
  specific_date: string | null;
  start_time: string;
  end_time: string;
  capacity: number;
  available_spots?: number;
};

export type PrivateLessonBooking = {
  id: number;
  private_lesson_slot_id: number | null;
  private_lesson_offer_id: number;
  student_id: number;
  invoice_id: number | null;
  status: string;
  preferred_period_name?: string | null;
  preferred_start_time?: string | null;
  preferred_end_time?: string | null;
  offer?: PrivateLessonOffer | null;
  slot?: PrivateLessonSlot | null;
  invoice?: Invoice | null;
};

export function privateLessonStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending_coordination: 'بانتظار تنسيق',
    pending_payment: 'بانتظار الدفع',
    confirmed: 'مؤكد',
    completed: 'مكتمل',
    cancelled: 'ملغى',
  };
  return map[status] ?? status;
}

export function installmentStatusLabel(status: string, isOverdue?: boolean): string {
  if (status === 'paid') return 'مسدَّدة';
  if (isOverdue) return 'متأخرة';
  return 'معلّقة';
}

/** Front-end preview only — backend calculates authoritative amounts/dates on subscribe */
export function previewInstallments(
  total: number,
  template: InstallmentTemplate,
): { sequence: number; amount: number; dueDate: string }[] {
  const pcts = template.split_percentages;
  const amounts: number[] = [];
  let allocated = 0;

  for (let i = 0; i < pcts.length - 1; i++) {
    const amt = Math.round((total * pcts[i]) / 100 * 1000) / 1000;
    amounts.push(amt);
    allocated += amt;
  }
  amounts.push(Number((total - allocated).toFixed(3)));

  const base = new Date();
  base.setHours(0, 0, 0, 0);

  return amounts.map((amount, i) => {
    const due = new Date(base);
    due.setDate(due.getDate() + (template.due_offset_days[i] ?? 0));
    return {
      sequence: i + 1,
      amount,
      dueDate: due.toISOString().slice(0, 10),
    };
  });
}

export function formatKwd(value: string | number): string {
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return `${n.toFixed(3)} د.ك`;
}

/** السعر قبل الخصم إن كان أعلى من السعر الحالي */
export function planCompareAt(plan: {
  price: string | number;
  compare_at_price?: string | number | null;
}): number | null {
  const price = Number(plan.price);
  const compare =
    plan.compare_at_price != null && String(plan.compare_at_price).trim() !== ''
      ? Number(plan.compare_at_price)
      : NaN;
  if (!Number.isFinite(price) || !Number.isFinite(compare) || compare <= price) return null;
  return compare;
}

export type EvaluationLevelRating = 'excellent' | 'good' | 'needs_follow_up';

export type GuardianEvaluation = {
  id: number;
  student_id: number;
  class_offering_id: number;
  numeric_score?: string | number | null;
  numeric_score_max?: string | number | null;
  level_rating?: EvaluationLevelRating | null;
  participation_rating?: number | null;
  understanding_rating?: number | null;
  homework_rating?: number | null;
  discipline_rating?: number | null;
  note?: string | null;
  class_offering?: {
    id: number;
    subject?: { id: number; name: string } | null;
  } | null;
  creator?: { id: number; name: string } | null;
  created_at?: string;
};

export type GuardianEducationalMaterial = {
  id: number;
  title: string;
  description?: string | null;
  media_id: number;
  scope: 'general' | 'targeted';
  media?: {
    id: number;
    url?: string | null;
    mime_type?: string | null;
    original_filename?: string | null;
  } | null;
  subject?: { id: number; name: string } | null;
  grade?: { id: number; name: string } | null;
  created_at?: string;
};

export type GuardianExamResult = {
  id: number;
  exam_id: number;
  student_id: number;
  score?: string | number | null;
  teacher_notes?: string | null;
  exam?: {
    id: number;
    name: string;
    exam_date: string;
    max_score: string | number;
    class_offering?: {
      id: number;
      subject?: { id: number; name: string } | null;
    } | null;
  } | null;
};

export function formatScorePair(
  score: string | number | null | undefined,
  max: string | number | null | undefined,
): string | null {
  if (score === null || score === undefined || score === '') return null;
  const s = Number(score);
  if (Number.isNaN(s)) return String(score);
  if (max === null || max === undefined || max === '') return String(s);
  const m = Number(max);
  if (Number.isNaN(m)) return `${s} / ${max}`;
  return `${s} / ${m}`;
}

export function evaluationLevelLabel(rating: EvaluationLevelRating): string {
  const map: Record<EvaluationLevelRating, string> = {
    excellent: 'ممتاز',
    good: 'جيد',
    needs_follow_up: 'يحتاج متابعة',
  };
  return map[rating];
}
