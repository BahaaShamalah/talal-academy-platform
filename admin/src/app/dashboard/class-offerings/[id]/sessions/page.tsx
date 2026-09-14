'use client';

import { ClassOfferingSessionsPage } from '@/components/class-offerings/class-offering-sessions-page';
import { use } from 'react';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ClassOfferingSessionsPage offeringId={id} />;
}
