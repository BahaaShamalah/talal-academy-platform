'use client';

import { Suspense } from 'react';
import ChildDetailPage from './ChildDetailClient';

export default function Page() {
  return (
    <Suspense fallback={<p className="text-[14px] text-[#8a8478]">جاري التحميل…</p>}>
      <ChildDetailPage />
    </Suspense>
  );
}
