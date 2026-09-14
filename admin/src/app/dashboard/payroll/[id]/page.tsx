'use client';

import { PayrollDetailPage } from '@/components/payroll/payroll-detail-page';
import { use } from 'react';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PayrollDetailPage runId={id} />;
}
