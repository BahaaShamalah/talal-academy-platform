import type { Metadata } from 'next';
import { LegalDocument, loadOrNotFound } from '@/components/legal/LegalDocument';

export const metadata: Metadata = {
  title: 'سياسة الخصوصية | طلال أكاديمي',
};

export default async function PrivacyPage() {
  const page = await loadOrNotFound('privacy');
  return <LegalDocument page={page} />;
}
