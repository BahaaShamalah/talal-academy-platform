'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { portalNav, portalNavActive } from '@/lib/portal';
import { usePortal } from './PortalProvider';
import Icon from '../ui/Icon';
import { cn } from '@/lib/cn';

export default function PortalSidebar() {
  const path = usePathname();
  const { logout, loggingOut } = usePortal();

  return (
    <aside className="pt-side sticky top-0 flex h-screen w-[236px] shrink-0 flex-col border-l border-gold/20 bg-navy">
      <div className="flex items-center gap-2.5 border-b border-white/[.07] px-4 py-4.5 py-[18px]">
        <span className="flex flex-col text-right leading-tight">
          <b className="font-display text-[15px] text-white">طلال أكاديمي</b>
          <span className="mt-1 font-[Marcellus,serif] text-[7px] tracking-[.2em] text-gold">
            PARENT PORTAL
          </span>
        </span>
        <Image src="/assets/talal-symbol-light.png" alt="" width={34} height={34} className="object-contain" />
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-2.5">
        {portalNav.map((n) => {
          const active = portalNavActive(path, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                'flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-[13.5px] transition-all',
                active
                  ? 'bg-gold/[.16] font-bold text-gold-soft shadow-[inset_3px_0_0_#c8a24a]'
                  : 'font-medium text-muted-nav hover:bg-gold/[.1]',
              )}
            >
              <span className="flex items-center gap-3">
                <Icon name={n.icon} className="w-4 text-center text-[13.5px]" />
                {n.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-2.5 border-t border-white/[.07] px-3.5 py-3">
        <Link href="/?stay=1" className="flex items-center gap-2.5 text-[12.5px] text-muted-dim">
          <Icon name="fa-solid fa-arrow-left" className="text-[11px]" /> العودة إلى الموقع
        </Link>
        <button
          type="button"
          disabled={loggingOut}
          onClick={() => void logout()}
          className="flex items-center gap-2.5 text-right text-[12.5px] text-[#c78d8d]"
        >
          <Icon name="fa-solid fa-arrow-right-from-bracket" className="text-[11px]" />
          {loggingOut ? 'جاري الخروج…' : 'تسجيل الخروج'}
        </button>
      </div>
    </aside>
  );
}
