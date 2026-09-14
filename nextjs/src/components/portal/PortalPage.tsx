'use client';

import PortalHeader from './PortalHeader';
import PortalChildSwitcher from './PortalChildSwitcher';

export default function PortalPage({
  title,
  crumb,
  children,
  showSwitcher = true,
}: {
  title: string;
  crumb: string;
  children: React.ReactNode;
  showSwitcher?: boolean;
}) {
  return (
    <>
      <PortalHeader title={title} crumb={crumb} />
      <main className="app-pad flex flex-col gap-3.5 px-[clamp(16px,3vw,32px)] pb-10 pt-[clamp(14px,2.4vw,24px)]">
        {showSwitcher ? <PortalChildSwitcher /> : null}
        {children}
      </main>
    </>
  );
}
