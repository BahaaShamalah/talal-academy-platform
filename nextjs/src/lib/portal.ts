import {
  type GuardianExamResult,
  type GuardianEvaluation,
  type Student,
  type Subscription,
} from '@/lib/account';

export const PORTAL_STUDENTS_QS =
  'include=currentGrade.educationalStage,planSubscriptions.plan,planSubscriptions.plan.subject,planSubscriptions.plan.productType,planSubscriptions.plan.durationPeriod,planSubscriptions.invoice,planSubscriptions.selectedSubjects.subject,enrollments.classOffering.subject&per_page=50';

const STUDENT_KEY = 'portal_student_id';

export const portalNav = [
  { href: '/portal', label: 'الرئيسية', icon: 'fa-solid fa-gauge-high' },
  { href: '/portal/children', label: 'أبنائي', icon: 'fa-solid fa-children' },
  { href: '/portal/schedule', label: 'الجدول', icon: 'fa-solid fa-calendar-week' },
  { href: '/portal/private-lessons', label: 'حصة خاصة', icon: 'fa-solid fa-user-graduate' },
  { href: '/portal/homework', label: 'المواد', icon: 'fa-solid fa-book-open' },
  { href: '/portal/reports', label: 'التقارير', icon: 'fa-solid fa-chart-line' },
  { href: '/portal/subscription', label: 'الاشتراك', icon: 'fa-solid fa-wallet' },
];

export function portalNavActive(path: string, href: string) {
  if (href === '/portal') return path === '/portal';
  return path === href || path.startsWith(`${href}/`);
}

export const portalQuickActions = [
  { icon: 'fa-solid fa-file-invoice', label: 'الفواتير', href: '/portal/subscription' },
  { icon: 'fa-solid fa-rotate', label: 'تجديد الاشتراك', href: '/portal/subscription' },
  { icon: 'fa-solid fa-calendar-week', label: 'الجدول', href: '/portal/schedule' },
  { icon: 'fa-solid fa-user-graduate', label: 'طلب حصة خاصة', href: '/portal/private-lessons/book' },
  { icon: 'fa-solid fa-book-open', label: 'المواد', href: '/portal/homework' },
  { icon: 'fa-solid fa-chart-line', label: 'التقارير', href: '/portal/reports' },
  { icon: 'fa-solid fa-user-plus', label: 'تسجيل ابن آخر', href: '/portal/children/new' },
];

const SUBJECT_COLORS = ['#0b234a', '#8a6a20', '#1c4b8f', '#2e6b5e', '#5c4a7a', '#a34b4b'];

export function personInitials(name?: string | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'و';
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0][0]}${parts[1][0]}`;
}

export function studentGradeLabel(student: Student | null | undefined): string {
  if (!student) return '';
  const grade = student.current_grade?.name;
  const stage = student.current_grade?.educational_stage?.name;
  if (grade && stage) return `${grade} — ${stage}`;
  return grade || stage || 'لم يُحدد الصف';
}

export function readStoredStudentId(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STUDENT_KEY);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function storeStudentId(id: number) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STUDENT_KEY, String(id));
}

export function formatDateAr(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString('ar-KW', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function paymentMethodLabel(method?: string | null): string {
  const map: Record<string, string> = {
    cash: 'نقدًا',
    manual_transfer: 'تحويل يدوي',
    online: 'دفع إلكتروني',
  };
  return (method && map[method]) || '—';
}

export function durationTypeLabel(type?: string | null): string {
  if (type === 'monthly_recurring') return 'شهري';
  if (type === 'fixed_period') return 'فصل دراسي';
  return '';
}

export function subjectIcon(name?: string | null): string {
  const n = (name ?? '').toLowerCase();
  if (/رياض|math/.test(n)) return 'fa-solid fa-square-root-variable';
  if (/عربي|arabic/.test(n)) return 'fa-solid fa-pen-nib';
  if (/engl|إنجل|انجليز/.test(n)) return 'fa-solid fa-language';
  if (/علوم|scien|فيز|كيم|أحياء/.test(n)) return 'fa-solid fa-flask';
  if (/قرآن|اسلام|دين/.test(n)) return 'fa-solid fa-book-quran';
  return 'fa-solid fa-book';
}

export function subjectColor(name?: string | null): string {
  const key = (name ?? '').trim() || 'x';
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return SUBJECT_COLORS[hash % SUBJECT_COLORS.length];
}

export function primarySubscription(student: Student | null | undefined): Subscription | null {
  const subs = student?.plan_subscriptions ?? [];
  return (
    subs.find((s) => s.status === 'active') ??
    subs.find((s) => s.status === 'pending_payment') ??
    subs.find((s) => s.status === 'frozen') ??
    subs[0] ??
    null
  );
}

export function subscriptionSubjects(student: Student | null | undefined): { name: string; teacher?: string }[] {
  const seen = new Map<string, { name: string; teacher?: string }>();
  for (const en of student?.enrollments ?? []) {
    const status = typeof en.status === 'string' ? en.status : en.status?.value;
    if (status && status !== 'active') continue;
    const name = en.class_offering?.subject?.name;
    if (!name) continue;
    const teacher = en.class_offering?.teacher?.name ?? undefined;
    if (!seen.has(name)) seen.set(name, { name, teacher });
  }
  for (const sub of student?.plan_subscriptions ?? []) {
    for (const row of sub.selected_subjects ?? []) {
      const name = row.subject?.name;
      if (name && !seen.has(name)) seen.set(name, { name });
    }
    const planSubject = sub.plan?.subject?.name;
    if (planSubject && !seen.has(planSubject)) seen.set(planSubject, { name: planSubject });
  }
  return [...seen.values()];
}

export function subscriptionProgress(sub: Subscription | null): { daysLeft: number; pctLeft: number } | null {
  if (!sub?.starts_at || !sub.ends_at) return null;
  const start = new Date(sub.starts_at).getTime();
  const end = new Date(sub.ends_at).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  const left = end - Date.now();
  const daysLeft = Math.max(0, Math.ceil(left / 86_400_000));
  const pctLeft = Math.max(0, Math.min(100, (left / (end - start)) * 100));
  return { daysLeft, pctLeft };
}

export function examPercent(row: GuardianExamResult): number | null {
  if (row.score == null || row.score === '') return null;
  const s = Number(row.score);
  const m = Number(row.exam?.max_score);
  if (!Number.isFinite(s)) return null;
  if (!Number.isFinite(m) || m <= 0) return null;
  return (s / m) * 100;
}

export function examAveragePercent(rows: GuardianExamResult[]): number | null {
  const pcts = rows.map(examPercent).filter((n): n is number => n != null);
  if (!pcts.length) return null;
  return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
}

export function subjectExamAverages(rows: GuardianExamResult[]): { name: string; score: number }[] {
  const buckets = new Map<string, number[]>();
  for (const row of rows) {
    const pct = examPercent(row);
    if (pct == null) continue;
    const name = row.exam?.class_offering?.subject?.name ?? 'اختبارات';
    const list = buckets.get(name) ?? [];
    list.push(pct);
    buckets.set(name, list);
  }
  return [...buckets.entries()].map(([name, list]) => ({
    name,
    score: Math.round(list.reduce((a, b) => a + b, 0) / list.length),
  }));
}

export function homeworkAverage(rows: GuardianEvaluation[]): number | null {
  const vals = rows
    .map((r) => r.homework_rating)
    .filter((n): n is number => typeof n === 'number' && n >= 1);
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

export function gradeFromPercent(pct: number): { label: string; tone: 'good' | 'mid' | 'low' } {
  if (pct >= 90) return { label: 'ممتاز', tone: 'good' };
  if (pct >= 80) return { label: 'جيد جدًا', tone: 'good' };
  if (pct >= 70) return { label: 'جيد', tone: 'mid' };
  if (pct >= 60) return { label: 'مقبول', tone: 'mid' };
  return { label: 'يحتاج متابعة', tone: 'low' };
}

export function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
