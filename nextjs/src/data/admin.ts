import type { AdminNavItem, Enrollment, Lesson, Section, Stat, TodayLesson } from '@/types/admin';

export const adminNav: AdminNavItem[] = [
  { href: '/admin', label: 'الرئيسية', icon: 'fa-solid fa-gauge-high' },
  { href: '/admin/branches', label: 'الفروع', icon: 'fa-solid fa-building', badge: '2' },
  { href: '/admin/rooms', label: 'القاعات', icon: 'fa-solid fa-door-open' },
  { href: '/admin/subjects', label: 'المواد', icon: 'fa-solid fa-book' },
  { href: '/admin/courses', label: 'الدورات', icon: 'fa-solid fa-layer-group' },
  { href: '/admin/sections', label: 'الشعب', icon: 'fa-solid fa-users-rectangle', badge: '42' },
  { href: '/admin/schedule', label: 'الجدول الأسبوعي', icon: 'fa-solid fa-calendar-week' },
  { href: '/admin/students', label: 'الطلاب', icon: 'fa-solid fa-graduation-cap', badge: '318' },
  { href: '/admin/enrollments', label: 'التسجيلات', icon: 'fa-solid fa-file-signature', badge: '6' },
  { href: '/admin/users', label: 'المستخدمين', icon: 'fa-solid fa-user-shield' },
  { href: '/admin/settings', label: 'الإعدادات', icon: 'fa-solid fa-gear' },
];

/** XX values stay as placeholders until the finance/attendance modules are wired. */
export const stats: Stat[] = [
  { icon: 'fa-solid fa-graduation-cap', value: '318', label: 'إجمالي الطلاب', note: 'المسجّلون هذا الفصل', trend: '+12', trendDir: 'up' },
  { icon: 'fa-solid fa-users-rectangle', value: '42', label: 'الشعب النشطة', note: 'من أصل 51 شعبة', trend: '+3', trendDir: 'up' },
  { icon: 'fa-solid fa-wallet', value: 'XX', label: 'إيرادات الشهر (د.ك)', note: 'بانتظار ربط النظام المالي', trend: '—', trendDir: 'flat' },
  { icon: 'fa-solid fa-calendar-check', value: 'XX%', label: 'نسبة الحضور العامة', note: 'بانتظار بيانات الحضور', trend: '—', trendDir: 'flat' },
];

export const enrollmentChart = [
  { month: 'سبتمبر', value: 38 },
  { month: 'أكتوبر', value: 52 },
  { month: 'نوفمبر', value: 44 },
  { month: 'ديسمبر', value: 61 },
  { month: 'يناير', value: 73 },
  { month: 'فبراير', value: 58 },
];

export const subjectColors: Record<string, string> = {
  'رياضيات': '#0b234a',
  'لغة عربية': '#8a6a20',
  'إنجليزي': '#1c4b8f',
  'قدرات': '#5c4a7a',
  'علوم': '#2e6b5e',
  'تحصيلي': '#7a3b3b',
};

export const todayLessons: TodayLesson[] = [
  { subject: 'رياضيات — المتوسط أ', teacher: 'أ. محمد الرشيدي', room: 'قاعة 1', time: '4:00 – 5:30' },
  { subject: 'لغة عربية — الابتدائي ب', teacher: 'أ. فاطمة العجمي', room: 'قاعة 2', time: '4:30 – 6:00' },
  { subject: 'دورة القدرات', teacher: 'أ. يوسف المطيري', room: 'قاعة 3', time: '6:00 – 7:30' },
  { subject: 'إنجليزي — محادثة', teacher: 'أ. نورة الصباح', room: 'مختبر الحاسوب', time: '6:30 – 8:00' },
];

export const recentEnrollments: Enrollment[] = [
  { id: 'e1', student: 'عبدالله الفهد', section: 'رياضيات — المتوسط أ', date: '2026-02-21', amount: '100 د.ك', status: 'confirmed' },
  { id: 'e2', student: 'دانة العنزي', section: 'لغة عربية — الابتدائي ب', date: '2026-02-21', amount: '280 د.ك', status: 'confirmed' },
  { id: 'e3', student: 'سلمان الرشيدي', section: 'دورة القدرات', date: '2026-02-20', amount: '120 د.ك', status: 'pending' },
  { id: 'e4', student: 'مريم الخالدي', section: 'إنجليزي — محادثة', date: '2026-02-20', amount: '90 د.ك', status: 'confirmed' },
  { id: 'e5', student: 'فيصل المطيري', section: 'رياضيات — المتوسط ب', date: '2026-02-19', amount: '100 د.ك', status: 'cancelled' },
];

/** Replace with GET /api/sections */
export const sections: Section[] = [
  { id: 's1', code: 'SEC-1042', name: 'رياضيات — المتوسط أ', course: 'رياضيات — متوسط', teacher: 'أ. محمد الرشيدي', room: 'قاعة 1', filled: 18, capacity: 20, startDate: '01/03', endDate: '28/05', status: 'active' },
  { id: 's2', code: 'SEC-1043', name: 'رياضيات — المتوسط ب', course: 'رياضيات — متوسط', teacher: 'أ. محمد الرشيدي', room: 'قاعة 1', filled: 20, capacity: 20, startDate: '01/03', endDate: '28/05', status: 'active' },
  { id: 's3', code: 'SEC-1051', name: 'لغة عربية — الابتدائي ب', course: 'لغة عربية — ابتدائي', teacher: 'أ. فاطمة العجمي', room: 'قاعة 2', filled: 14, capacity: 22, startDate: '01/03', endDate: '28/05', status: 'active' },
  { id: 's4', code: 'SEC-1088', name: 'دورة القدرات — الدفعة 7', course: 'دورة القدرات', teacher: 'أ. يوسف المطيري', room: 'قاعة 3', filled: 9, capacity: 25, startDate: '15/03', endDate: '30/04', status: 'upcoming' },
  { id: 's5', code: 'SEC-1089', name: 'دورة التحصيلي — الدفعة 4', course: 'دورة التحصيلي', teacher: 'أ. عبدالله الفهد', room: 'قاعة 3', filled: 0, capacity: 25, startDate: '01/04', endDate: '15/05', status: 'upcoming' },
  { id: 's6', code: 'SEC-1067', name: 'إنجليزي — محادثة (مستوى 2)', course: 'الإنجليزية للمحادثة', teacher: 'أ. نورة الصباح', room: 'مختبر الحاسوب', filled: 16, capacity: 18, startDate: '10/01', endDate: '20/02', status: 'done' },
  { id: 's7', code: 'SEC-1055', name: 'علوم — المتوسط أ', course: 'علوم — متوسط', teacher: 'أ. هدى الشمري', room: 'قاعة 2', filled: 3, capacity: 20, startDate: '01/03', endDate: '28/05', status: 'cancelled' },
];

export const teachers = ['أ. محمد الرشيدي', 'أ. فاطمة العجمي', 'أ. يوسف المطيري', 'أ. نورة الصباح', 'أ. عبدالله الفهد', 'أ. هدى الشمري'];
export const rooms = ['قاعة 1 — الفرع الرئيسي', 'قاعة 2 — الفرع الرئيسي', 'قاعة 3 — فرع الجهراء', 'مختبر الحاسوب'];
export const coursesList = ['رياضيات — المرحلة المتوسطة', 'لغة عربية — الابتدائية', 'دورة القدرات', 'دورة التحصيلي', 'الإنجليزية للمحادثة', 'علوم — متوسط'];

export const weekDays = [
  { name: 'السبت', date: '22/02' },
  { name: 'الأحد', date: '23/02' },
  { name: 'الاثنين', date: '24/02' },
  { name: 'الثلاثاء', date: '25/02' },
  { name: 'الأربعاء', date: '26/02' },
];

export const timeSlots = ['4:00\n5:30', '5:30\n6:30', '6:30\n7:30', '7:30\n8:30'];

/** null = free slot */
export const weekGrid: (Lesson | null)[][] = [
  [
    { subject: 'رياضيات', teacher: 'أ. محمد الرشيدي', room: 'قاعة 1' },
    { subject: 'لغة عربية', teacher: 'أ. فاطمة العجمي', room: 'قاعة 2' },
    { subject: 'رياضيات', teacher: 'أ. محمد الرشيدي', room: 'قاعة 1' },
    null,
    { subject: 'علوم', teacher: 'أ. هدى الشمري', room: 'قاعة 2' },
  ],
  [
    { subject: 'لغة عربية', teacher: 'أ. فاطمة العجمي', room: 'قاعة 2' },
    { subject: 'قدرات', teacher: 'أ. يوسف المطيري', room: 'قاعة 3' },
    null,
    { subject: 'إنجليزي', teacher: 'أ. نورة الصباح', room: 'مختبر' },
    { subject: 'رياضيات', teacher: 'أ. محمد الرشيدي', room: 'قاعة 1' },
  ],
  [
    { subject: 'قدرات', teacher: 'أ. يوسف المطيري', room: 'قاعة 3' },
    null,
    { subject: 'تحصيلي', teacher: 'أ. عبدالله الفهد', room: 'قاعة 3' },
    { subject: 'قدرات', teacher: 'أ. يوسف المطيري', room: 'قاعة 3' },
    null,
  ],
  [
    { subject: 'إنجليزي', teacher: 'أ. نورة الصباح', room: 'مختبر' },
    { subject: 'علوم', teacher: 'أ. هدى الشمري', room: 'قاعة 2' },
    { subject: 'إنجليزي', teacher: 'أ. نورة الصباح', room: 'مختبر' },
    null,
    { subject: 'تحصيلي', teacher: 'أ. عبدالله الفهد', room: 'قاعة 3' },
  ],
];
