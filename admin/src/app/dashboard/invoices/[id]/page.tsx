'use client';

import { InvoiceDetailPage } from '@/components/invoices/invoice-detail-page';
import { use } from 'react';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <InvoiceDetailPage invoiceId={id} />;
}
