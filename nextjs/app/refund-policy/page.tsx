import type { Metadata } from 'next';
import { LegalDocument, loadOrNotFound } from '@/components/legal/LegalDocument';

export const metadata: Metadata = {
  title: 'سياسة الاسترجاع | طلال أكاديمي',
};

export default async function RefundPolicyPage() {
  const page = await loadOrNotFound('refund-policy');
  return <LegalDocument page={page} />;
}
