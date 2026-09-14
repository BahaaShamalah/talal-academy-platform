/** Teacher portal stub only — parent portal uses live APIs. */
export const teacher = {
  name: 'أ. محمد الرشيدي',
  role: 'معلم رياضيات',
  initials: 'م.ر',
  stats: [
    { icon: 'fa-solid fa-users-rectangle', value: '6', label: 'شعبي هذا الفصل' },
    { icon: 'fa-solid fa-graduation-cap', value: '104', label: 'إجمالي الطلاب' },
    { icon: 'fa-solid fa-calendar-check', value: '3', label: 'حصص اليوم' },
    { icon: 'fa-solid fa-clipboard-check', value: '12', label: 'واجبات بانتظار التصحيح' },
  ],
  classes: [
    { name: 'رياضيات — المتوسط أ', time: '4:00 – 5:30', room: 'قاعة 1', students: 18, done: true },
    { name: 'رياضيات — المتوسط ب', time: '5:30 – 6:30', room: 'قاعة 1', students: 20, done: false },
    { name: 'رياضيات — الابتدائي ج', time: '6:30 – 8:00', room: 'قاعة 2', students: 14, done: false },
  ],
  tasks: [
    { icon: 'fa-solid fa-pen-to-square', label: 'تصحيح واجب الكسور — المتوسط أ', meta: '12 طالبًا' },
    { icon: 'fa-solid fa-star', label: 'إدخال درجات اختبار الوحدة الثالثة', meta: 'المتوسط ب' },
    { icon: 'fa-solid fa-comment-dots', label: 'ملاحظات لأولياء أمور 3 طلاب', meta: 'الابتدائي ج' },
  ],
};
