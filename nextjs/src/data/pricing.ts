import type { PricingPlan, Group } from '@/types';

/** Replace with GET /api/plans */
export const pricingPlans: PricingPlan[] = [
  { id: 'monthly', name: 'الاشتراك الشهري', note: 'باقة شاملة · تُجدَّد شهريًا', price: '100' },
  { id: 'course', name: 'باقة الكورس', note: 'الكورس الكامل · خصم مبكر', price: '280', originalPrice: '300', discountLabel: 'خصم التسجيل المبكر', offerEnd: '9/1' },
];

export const groups: Group[] = [
  { id: 'g1', days: 'السبت – الأربعاء', time: '4:00 – 6:00 مساءً', seats: 'مقاعد متاحة', open: true },
  { id: 'g2', days: 'السبت – الأربعاء', time: '6:00 – 8:00 مساءً', seats: 'مقاعد متاحة', open: true },
  { id: 'g3', days: 'السبت – الاثنين – الأربعاء', time: '4:00 – 7:00 مساءً', seats: 'قائمة انتظار', open: false },
];
