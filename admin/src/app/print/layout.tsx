import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'معاينة طباعة A4 | طلال أكاديمي',
};

/** Minimal layout — no admin sidebar; print CSS hides toolbar. */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
