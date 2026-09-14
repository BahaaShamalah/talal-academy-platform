import type { Program, Stage, Course } from '@/types';

/** Replace with GET /api/programs */
export const programs: Program[] = [
  { id: 'primary', name: 'المرحلة الابتدائية', grades: 'الصف الأول — الخامس', price: '100', unit: 'د.ك / شهريًا', note: 'الكورس 280 د.ك بدل 300', badge: 'عرض مبكر', available: true },
  { id: 'middle', name: 'المرحلة المتوسطة', grades: 'الصف السادس — التاسع', price: '70', unit: 'د.ك / شهريًا', note: 'باقات مرنة حسب عدد المواد', available: true },
  { id: 'secondary', name: 'المرحلة الثانوية', grades: 'الصفوف الثانوية', price: 'XX', unit: 'د.ك', note: 'القدرات والتحصيلي', available: true },
];

export const stages: Stage[] = [
  { id: 'primary', name: 'المرحلة الابتدائية', desc: 'الصف الأول إلى الخامس', icon: 'fa-solid fa-pencil' },
  { id: 'middle', name: 'المرحلة المتوسطة', desc: 'الصف السادس إلى التاسع', icon: 'fa-solid fa-book-open' },
  { id: 'secondary', name: 'المرحلة الثانوية', desc: 'الصفوف الثانوية · القدرات والتحصيلي', icon: 'fa-solid fa-graduation-cap' },
];

/** Replace with GET /api/courses */
export const courses: Course[] = [
  { icon: 'fa-solid fa-moon', tag: 'ليلة الاختبار', name: 'مراجعة ليلة الاختبار', desc: 'جلسة مكثّفة تغطي أهم النقاط قبل الاختبار مباشرة.', duration: 'جلسة واحدة · 3 ساعات', price: '25' },
  { icon: 'fa-solid fa-bolt', tag: 'مكثّفة', name: 'دورة القدرات', desc: 'تدريب على نماذج الاختبار واستراتيجيات الحل السريع.', duration: '6 أسابيع', price: '120' },
  { icon: 'fa-solid fa-square-poll-vertical', tag: 'مكثّفة', name: 'دورة التحصيلي', desc: 'مراجعة شاملة لمواد التحصيلي مع اختبارات محاكية.', duration: '6 أسابيع', price: '120' },
  { icon: 'fa-solid fa-language', tag: 'لغات', name: 'الإنجليزية للمحادثة', desc: 'مستويات متدرّجة تركّز على النطق والمحادثة.', duration: '8 أسابيع', price: '90' },
  { icon: 'fa-solid fa-code', tag: 'مهارات', name: 'أساسيات البرمجة', desc: 'مقدمة عملية للبرمجة والتفكير المنطقي للطلاب.', duration: '8 أسابيع', price: '110' },
  { icon: 'fa-solid fa-book-quran', tag: 'تحفيظ', name: 'حلقة التحفيظ', desc: 'متابعة الحفظ والتجويد بإشراف معلمين متخصصين.', duration: 'مستمرة', price: '45' },
];
