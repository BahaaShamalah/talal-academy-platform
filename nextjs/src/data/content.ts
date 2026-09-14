import type { Benefit, Faq, NavItem, StudioItem } from '@/types';

export const benefits: Benefit[] = [
  { icon: 'fa-solid fa-chalkboard-user', title: 'معلمون متخصصون', desc: 'نخبة من المعلمين المعتمدين لكل مادة.' },
  { icon: 'fa-solid fa-chart-line', title: 'متابعة مستمرة', desc: 'تقارير دورية عن مستوى الطالب وتقدّمه.' },
  { icon: 'fa-solid fa-pen-to-square', title: 'حل الواجبات', desc: 'مساعدة ومتابعة يومية للواجبات المدرسية.' },
  { icon: 'fa-solid fa-clipboard-check', title: 'مراجعة الاختبارات', desc: 'تجهيز الطالب ومراجعة شاملة قبل الاختبارات.' },
  { icon: 'fa-solid fa-book', title: 'تحفيظ ومراجعة', desc: 'متابعة الحفظ والمراجعة بانتظام.' },
  { icon: 'fa-solid fa-lightbulb', title: 'بيئة تعليمية محفّزة', desc: 'فصول حديثة مريحة تساعد على التركيز.' },
];

export const parentGets: Benefit[] = [
  { icon: 'fa-solid fa-pen-to-square', title: 'حل الواجبات', desc: '' },
  { icon: 'fa-solid fa-clipboard-check', title: 'مراجعة الاختبارات', desc: '' },
  { icon: 'fa-solid fa-book', title: 'التحفيظ', desc: '' },
  { icon: 'fa-solid fa-eye', title: 'متابعة الطالب', desc: '' },
  { icon: 'fa-solid fa-calendar-check', title: 'الحضور', desc: '' },
  { icon: 'fa-solid fa-star', title: 'التقييم', desc: '' },
  { icon: 'fa-solid fa-comment-dots', title: 'ملاحظات المعلم', desc: '' },
];

export const heroFeatures: Benefit[] = [
  { icon: 'fa-solid fa-users', title: 'معلمون متخصصون', desc: 'خبرة في التدريس' },
  { icon: 'fa-solid fa-chart-line', title: 'متابعة مستمرة', desc: 'لمستوى الطالب' },
  { icon: 'fa-solid fa-school', title: 'برامج حضورية', desc: 'في بيئة تعليمية محفّزة' },
  { icon: 'fa-solid fa-lock', title: 'تسجيل ودفع إلكتروني', desc: 'سهل وآمن' },
];

/** Replace with GET /api/faqs */
export const faqs: Faq[] = [
  { q: 'ما المراحل التي يقدمها المعهد؟', a: 'نقدّم برامج حضورية للمراحل الابتدائية والمتوسطة والثانوية، إضافة إلى القدرات والتحصيلي.' },
  { q: 'هل التسجيل شهري أم للكورس؟', a: 'يمكنك الاختيار بين اشتراك شهري أو باقة الكورس الكامل حسب ما يناسب ابنك.' },
  { q: 'كيف يتم الدفع؟', a: 'الدفع إلكتروني عبر KNET وبطاقات الدفع، مع فاتورة إلكترونية وتأكيد فوري.' },
  { q: 'هل يمكن تسجيل أكثر من ابن؟', a: 'نعم، حساب واحد لولي الأمر يتيح تسجيل ومتابعة جميع الأبناء.' },
  { q: 'ما أيام الدوام؟', a: 'خمسة أيام أسبوعيًا: من السبت إلى الأربعاء.' },
  { q: 'ما أوقات الدوام؟', a: 'من الساعة 4:00 حتى 8:00 مساءً.' },
  { q: 'هل يوجد خصم للتسجيل المبكر؟', a: 'نعم، يتوفر خصم للتسجيل المبكر خلال الفترة المعلنة لكل عرض.' },
  { q: 'هل يمكن تجديد الاشتراك إلكترونيًا؟', a: 'نعم، يمكنك تجديد الاشتراك بسهولة من حساب ولي الأمر.' },
  { q: 'هل يمكن تغيير البرنامج؟', a: 'يمكنك تغيير البرنامج أو الباقة عبر التواصل مع إدارة المعهد.' },
  { q: 'هل يوجد تعويض في حال غياب الطالب؟', a: 'تُطبَّق سياسة تعويض الحصص وفق ضوابط المعهد المعلنة.' },
];

export const navItems: NavItem[] = [
  { id: 'home', label: 'الرئيسية', icon: 'fa-solid fa-house' },
  { id: 'programs', label: 'البرامج', icon: 'fa-solid fa-layer-group' },
  { id: 'private-lessons', label: 'حصص خاصة', icon: 'fa-solid fa-user-graduate' },
  { id: 'about', label: 'عن المعهد', icon: 'fa-solid fa-building-columns' },
  { id: 'faq', label: 'الأسئلة الشائعة', icon: 'fa-solid fa-circle-question' },
  { id: 'contact', label: 'تواصل معنا', icon: 'fa-solid fa-headset' },
];

/** Mobile bottom tab bar — 5 items */
export const tabItems: NavItem[] = [
  { id: 'home', label: 'الرئيسية', icon: 'fa-solid fa-house' },
  { id: 'programs', label: 'البرامج', icon: 'fa-solid fa-layer-group' },
  { id: 'private-lessons', label: 'حصص خاصة', icon: 'fa-solid fa-user-graduate' },
  { id: 'faq', label: 'الأسئلة', icon: 'fa-solid fa-circle-question' },
  { id: 'contact', label: 'تواصل', icon: 'fa-solid fa-headset' },
];

export const studioCats: { id: 'all' | 'classes' | 'facility' | 'events'; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'classes', label: 'الفصول' },
  { id: 'facility', label: 'المرافق' },
  { id: 'events', label: 'الفعاليات' },
];

/** Drop real photos into /public/studio and set `src` */
export const studioItems: StudioItem[] = [
  { id: 's1', cat: 'classes', title: 'فصل المرحلة الابتدائية', ph: 'صورة فصل ابتدائي' },
  { id: 's2', cat: 'classes', title: 'حصة مراجعة', ph: 'صورة حصة مراجعة' },
  { id: 's3', cat: 'facility', title: 'الاستقبال', ph: 'صورة الاستقبال' },
  { id: 's4', cat: 'facility', title: 'قاعة المذاكرة', ph: 'صورة قاعة المذاكرة' },
  { id: 's5', cat: 'events', title: 'تكريم المتميزين', ph: 'صورة حفل تكريم' },
  { id: 's6', cat: 'events', title: 'يوم الأنشطة', ph: 'صورة نشاط طلابي' },
];

export const contact = {
  phones: ['51152474', '51152308'],
  management: 'أ. طلال العنزي',
  days: 'السبت – الأربعاء',
  hours: '4:00 – 8:00 مساءً',
  country: 'الكويت',
};
