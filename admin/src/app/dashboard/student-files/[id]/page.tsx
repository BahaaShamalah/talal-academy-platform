'use client';

import { StudentFileDetailPage } from '@/components/student-files/student-file-detail-page';
import { use } from 'react';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <StudentFileDetailPage studentId={id} />;
}
