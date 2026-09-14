import type { Program, PricingPlan, Announcement, Faq, ContactPayload } from '@/types';
import { programs as mockPrograms, courses as mockCourses } from '@/data/programs';
import { pricingPlans as mockPlans } from '@/data/pricing';
import { announcements as mockAnnouncements } from '@/data/announcements';
import { faqs as mockFaqs } from '@/data/content';

const BASE = process.env.NEXT_PUBLIC_API_URL;

/**
 * Every getter falls back to mock data when NEXT_PUBLIC_API_URL is unset,
 * so the frontend runs standalone until the Laravel API is live.
 * Endpoints expected: /programs /plans /offers /faqs /enrollments /contact
 */
async function get<T>(path: string, fallback: T): Promise<T> {
  if (!BASE) return fallback;
  try {
    const res = await fetch(`${BASE}${path}`, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`${res.status} ${path}`);
    return (await res.json()) as T;
  } catch (err) {
    console.warn('[api] falling back to mock data for', path, err);
    return fallback;
  }
}

export const getPrograms   = () => get<Program[]>('/programs', mockPrograms);
export const getCourses    = () => get('/courses', mockCourses);
export const getPlans      = () => get<PricingPlan[]>('/plans', mockPlans);
export const getOffers     = () => get<Announcement[]>('/offers', mockAnnouncements);
export const getFaqs       = () => get<Faq[]>('/faqs', mockFaqs);

export async function postContact(payload: ContactPayload): Promise<{ ok: boolean }> {
  if (!BASE) return { ok: true }; // mock success
  const res = await fetch(`${BASE}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok };
}
