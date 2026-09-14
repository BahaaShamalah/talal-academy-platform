'use client';

import { Suspense } from 'react';
import { ScheduleBulkImportPage } from '@/components/schedule-bulk-import/schedule-bulk-import-page';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ScheduleBulkImportPage />
    </Suspense>
  );
}
