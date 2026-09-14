'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { portalNav, portalNavActive } from '@/lib/portal';
import Icon from '../ui/Icon';
import { cn } from '@/lib/cn';

export default function PortalTabBar() {
  const path = usePathname();
  return (
    <nav className="pt-tabs">
      {portalNav.map((n) => {
        const active = portalNavActive(path, n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            className={cn(
              'flex flex-col items-center gap-1 rounded-xl py-1.5 transition-all',
              active ? 'bg-gold/[.14] text-gold-soft' : 'text-[#93a0bd]',
            )}
          >
            <Icon name={n.icon} className="text-[17px]" />
            <span className="whitespace-nowrap text-[9.5px] font-bold">{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
