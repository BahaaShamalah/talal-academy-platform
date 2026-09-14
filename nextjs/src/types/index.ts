export type ViewId = 'home' | 'programs' | 'private-lessons' | 'about' | 'faq' | 'contact';

const VIEW_IDS: ViewId[] = ['home', 'programs', 'private-lessons', 'about', 'faq', 'contact'];

/** يحوّل روابط CMS القديمة (مثل pricing) لصفحة صالحة */
export function normalizeViewId(raw: string): ViewId {
  if (raw === 'pricing') return 'programs';
  return VIEW_IDS.includes(raw as ViewId) ? (raw as ViewId) : 'home';
}

export interface Program {
  id: string;
  name: string;
  grades: string;
  price: string;
  unit: string;
  note: string;
  badge?: string;
  image?: string;
  available?: boolean;
}

export interface Course {
  icon: string;
  tag: string;
  name: string;
  desc: string;
  duration: string;
  price: string;
}

export interface PricingPlan {
  id: string;
  programId?: string;
  name: string;
  note: string;
  price: string;
  originalPrice?: string;
  discountLabel?: string;
  offerStart?: string;
  offerEnd?: string;
}

export interface Announcement {
  id: string;
  icon: string;
  title: string;
  desc: string;
  cta: string;
  view: ViewId;
  bg: string;
}

export interface Stage { id: string; name: string; desc: string; icon: string; }
export interface Benefit { icon: string; title: string; desc: string; }
export interface Faq { q: string; a: string; }
export interface Group { id: string; days: string; time: string; seats: string; open: boolean; }
export interface StudioItem { id: string; cat: StudioCat; title: string; ph: string; src?: string; }
export type StudioCat = 'classes' | 'facility' | 'events';
export interface NavItem { id: ViewId; label: string; icon?: string; }

export interface ContactPayload {
  name: string;
  phone: string;
  stage?: string;
  message?: string;
}

export interface EnrollmentDraft {
  stageId: string | null;
  programId: string | null;
  planId: string | null;
  groupId: string | null;
  parent: { name: string; phone: string; email?: string };
  student: {
    name: string;
    stageId: string;
    school: string;
    phone: string;
    phoneSecondary?: string;
    civilId?: string;
  };
}
