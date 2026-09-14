import type { PayMethod } from '@/types/portal';

/** Fallback step labels when marketing section is unavailable. */
export const stepLabels = [
  'اختر المرحلة',
  'اختر الصف',
  'اختر الباقة',
  'بيانات ولي الأمر',
  'بيانات الطالب',
  'الدفع',
  'تم التسجيل',
];

/** Fallback guide lines (سارة). */
export const mascotLines = [
  'أهلاً! أنا سارة. لنبدأ — أي مرحلة دراسية يدرس فيها ابنك؟',
  'جميل. الآن حدّد صفه بالتحديد.',
  'ممتاز! اختر الباقة المناسبة لابنك — السعر يظهر فورًا.',
  'نحتاج التحقق من رقمك لنبقيك على اطّلاع بتقدّم ابنك.',
  'بيانات الطالب تساعد المعلمين على متابعته من اليوم الأول.',
  'اختر طريقة الدفع الأنسب لك — كامل، تقسيط، أو في المعهد.',
  'تم! أهلاً بابنك في طلال أكاديمي. سنتواصل معك قريبًا.',
];

export const payMethods: PayMethod[] = [
  {
    id: 'full',
    name: 'الدفع كامل',
    desc: 'سدّد المبلغ كاملاً الآن عبر بوابة الدفع الإلكترونية.',
    icon: 'fa-solid fa-credit-card',
  },
  {
    id: 'installments',
    name: 'الدفع بالتقسيط',
    desc: 'قسّم المبلغ على دفعات حسب قالب الباقة (إن وُجد).',
    icon: 'fa-solid fa-calendar-days',
  },
  {
    id: 'onsite',
    name: 'الدفع في المعهد',
    desc: 'احجز مقعدك الآن وسدّد نقدًا أو بالبطاقة في مقر المعهد.',
    icon: 'fa-solid fa-building-columns',
  },
];

export const STAGE_ICONS = [
  'fa-solid fa-pencil',
  'fa-solid fa-book-open',
  'fa-solid fa-graduation-cap',
];
