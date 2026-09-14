'use client';

import { Suspense } from 'react';
import { StudentFilesPage } from '@/components/student-files/student-files-page';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-5 text-[13px] text-ink-dim">جاري التحميل…</div>}>
      <StudentFilesPage />
    </Suspense>
  );
}
