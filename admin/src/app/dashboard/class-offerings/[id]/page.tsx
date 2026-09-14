'use client';

import { ClassOfferingDetailPage } from '@/components/class-offerings/class-offering-detail-page';
import { use } from 'react';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ClassOfferingDetailPage offeringId={id} />;
}
