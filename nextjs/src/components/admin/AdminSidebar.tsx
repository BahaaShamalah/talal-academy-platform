'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminNav } from '@/data/admin';
import Icon from '../ui/Icon';
import { cn } from '@/lib/cn';

export default function AdminSidebar() {
  const path = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-[246px] shrink-0 flex-col border-l border-gold/20 bg-navy lg:flex">
      <div className="flex items-center gap-2.5 border-b border-white/[.07] px-4 py-4">
        <Image src="/assets/talal-symbol-light.png" alt="" width={34} height={34} className="object-contain" />
        <div className="leading-tight">
          <div className="font-display text-[15px] font-bold text-white">طلال أكاديمي</div>
          <div className="font-latin mt-0.5 text-[7.5px] tracking-[.2em] text-gold">ADMIN PANEL</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-[3px] overflow-y-auto p-2.5">
        {adminNav.map((n) => {
          const active = n.href === '/admin' ? path === '/admin' : path.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                'flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-[13.5px] transition-all',
                active
                  ? 'bg-gold/[.16] font-bold text-gold-soft shadow-[inset_3px_0_0_#c8a24a]'
                  : 'font-medium text-muted-nav hover:bg-gold/[.12] hover:text-gold-soft',
              )}
            >
              <span className="flex items-center gap-3">
                <Icon name={n.icon} className="w-4 text-center text-[13.5px]" />
                {n.label}
              </span>
              {n.badge && (
                <span className={cn('font-latin rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold', active ? 'bg-gold-soft/20 text-gold-soft' : 'bg-white/[.08] text-muted-dim')}>
                  {n.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="font-latin border-t border-white/[.07] px-3.5 py-3 text-[10px] text-[#5d6b8a]">v1.0 · الكويت</div>
    </aside>
  );
}
