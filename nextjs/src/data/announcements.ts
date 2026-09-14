import type { Announcement } from '@/types';

/** Replace with GET /api/offers */
export const announcements: Announcement[] = [
  { id: 'exam-night', icon: 'fa-solid fa-moon', title: 'عرض ليلة الاختبار', desc: 'مراجعة مكثّفة ليلة الاختبار لجميع المواد — مقاعد محدودة.', cta: 'احجز مقعدك', view: 'programs', bg: 'linear-gradient(100deg,#7a1f2b,#b23b3b)' },
  { id: 'early-bird', icon: 'fa-solid fa-fire', title: 'خصم التسجيل المبكر', desc: 'كورس المرحلة الابتدائية 280 د.ك بدل 300 — حتى 9/1.', cta: 'استفد من العرض', view: 'programs', bg: 'linear-gradient(100deg,#8a6a20,#c8a24a)' },
  { id: 'qudurat', icon: 'fa-solid fa-bolt', title: 'دورة القدرات المكثّفة', desc: 'دفعة جديدة تبدأ قريبًا — تدريب على نماذج الاختبار.', cta: 'عرض الدورات', view: 'programs', bg: 'linear-gradient(100deg,#123163,#1c4b8f)' },
  { id: 'siblings', icon: 'fa-solid fa-users', title: 'خصم الأخوة', desc: 'سجّل أكثر من ابن واحصل على خصم على الاشتراك الثاني.', cta: 'تفاصيل الباقات', view: 'programs', bg: 'linear-gradient(100deg,#0c4a3e,#0a7d63)' },
];
