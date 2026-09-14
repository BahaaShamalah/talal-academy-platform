'use client';

import { GuardianDetailPage } from '@/components/guardians/guardian-detail-page';
import { use } from 'react';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <GuardianDetailPage guardianId={id} />;
}
