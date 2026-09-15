import type { Metadata } from 'next';
import { LegalDocument, loadOrNotFound } from '@/components/legal/LegalDocument';

export const metadata: Metadata = {
  title: 'الشروط والأحكام | طلال أكاديمي',
};

export default async function TermsPage() {
  const page = await loadOrNotFound('terms');
  return <LegalDocument page={page} />;
}
