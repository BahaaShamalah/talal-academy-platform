import { Suspense } from 'react';
import { MyPortalPage } from '@/components/my-portal/my-portal-page';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-5 text-[13px] text-ink-dim">جاري التحميل…</div>}>
      <MyPortalPage />
    </Suspense>
  );
}
