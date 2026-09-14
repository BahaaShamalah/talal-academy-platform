'use client';

import PortalNotifications from './PortalNotifications';
import PortalUserMenu from './PortalUserMenu';

export default function PortalHeader({ title, crumb }: { title: string; crumb: string }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3.5 border-b border-cream-line bg-[#fffefb] px-[clamp(16px,3vw,32px)] py-3.5">
      <div className="min-w-0">
        <h1 className="font-display text-[21px] font-bold text-navy-800">{title}</h1>
        <div className="mt-1 text-[11.5px] text-ink-faint">{crumb}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <PortalNotifications />
        <PortalUserMenu />
      </div>
    </header>
  );
}
