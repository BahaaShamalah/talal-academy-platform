'use client';

import { PortalProvider, usePortal } from './PortalProvider';
import PortalSidebar from './PortalSidebar';
import PortalTabBar from './PortalTabBar';

function PortalFrame({ children }: { children: React.ReactNode }) {
  const { loading, error, retry, guardian } = usePortal();

  if (loading || (!guardian && !error)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-navy-800/20 border-t-navy-800" />
          <p className="mt-3 text-[14px] text-ink-dim">جاري تحميل بوابة ولي الأمر…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-cream px-6 text-center">
        <p className="text-[15px] font-bold text-navy-800">{error}</p>
        <button
          type="button"
          onClick={retry}
          className="rounded-full bg-navy-800 px-5 py-2.5 text-[13px] font-extrabold text-gold-soft"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-screen bg-cream">
        <PortalSidebar />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
      <PortalTabBar />
    </>
  );
}

export default function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <PortalProvider>
      <PortalFrame>{children}</PortalFrame>
    </PortalProvider>
  );
}
