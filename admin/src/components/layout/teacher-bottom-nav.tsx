'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  NAV_GROUPS,
  NAV_MY_PORTAL,
  isNavItemActive,
  isNavItemVisible,
  type NavGroup,
  type NavItem,
} from '@/config/nav';
import { Icon } from '@/components/ui/icon';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

const EMPTY_PERMISSIONS: string[] = [];

const TABS = [
  {
    id: 'portal',
    href: '/dashboard/my-portal',
    label: 'بوابتي',
    icon: 'fa-solid fa-house',
    permission: 'teacher-portal.view',
    match: (p: string) => p === '/dashboard/my-portal' || p.startsWith('/dashboard/my-portal/'),
  },
  {
    id: 'classes',
    href: '/dashboard/my-classes',
    label: 'صفوفي',
    icon: 'fa-solid fa-chalkboard-user',
    permission: 'teacher-portal.classes',
    match: (p: string) => p.startsWith('/dashboard/my-classes'),
  },
  {
    id: 'leaves',
    href: '/dashboard/my-leaves',
    label: 'إجازاتي',
    icon: 'fa-solid fa-plane-departure',
    permission: 'teacher-portal.leaves',
    match: (p: string) => p.startsWith('/dashboard/my-leaves'),
  },
  {
    id: 'payroll',
    href: '/dashboard/my-payroll',
    label: 'راتبي',
    icon: 'fa-solid fa-wallet',
    permission: 'teacher-portal.payroll',
    match: (p: string) => p.startsWith('/dashboard/my-payroll'),
  },
] as const;

function MoreSheetLinks({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const permissions = user?.permissions ?? EMPTY_PERMISSIONS;
  const roles = user?.roles ?? [];

  const visibleGroups = useMemo(() => {
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => isNavItemVisible(item, permissions, roles)),
    })).filter((group) => group.items.length > 0);
  }, [permissions, roles]);

  function linkClass(active: boolean) {
    return cn(
      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition-all',
      active
        ? 'bg-gold/[.16] font-bold text-gold-soft'
        : 'font-medium text-muted-nav hover:bg-gold/[.12] hover:text-gold-soft',
    );
  }

  function Item({ item }: { item: NavItem }) {
    const active = isNavItemActive(pathname, item.href);
    return (
      <Link href={item.href} onClick={onNavigate} className={linkClass(active)}>
        <Icon name={item.icon} className="w-4 text-center text-[13.5px]" />
        {item.title}
      </Link>
    );
  }

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
      {isNavItemVisible(NAV_MY_PORTAL, permissions, roles) ? <Item item={NAV_MY_PORTAL} /> : null}
      {visibleGroups.map((group: NavGroup & { items: NavItem[] }) => (
        <div key={group.id} className="mt-2">
          <p className="mb-1 px-3 text-[11px] font-bold text-[#8a97b3]">{group.title}</p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <Item key={item.href} item={item} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function TeacherBottomNav() {
  const pathname = usePathname();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [moreOpen, setMoreOpen] = useState(false);
  const visibleTabs = TABS.filter((tab) => hasPermission(tab.permission));
  const colCount = Math.max(visibleTabs.length + 1, 2);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-cream-line bg-[#fffefb]/95 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="تنقل المعلم"
      >
        <div
          className="mx-auto grid max-w-lg px-1.5 pt-1.5 pb-1"
          style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
        >
          {visibleTabs.map((tab) => {
            const active = tab.match(pathname);
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-bold transition-colors',
                  active ? 'text-navy' : 'text-ink-dim',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-[14px]',
                    active ? 'bg-navy text-gold' : 'bg-transparent',
                  )}
                >
                  <Icon name={tab.icon} />
                </span>
                {tab.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex flex-col items-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-bold',
              moreOpen ? 'text-navy' : 'text-ink-dim',
            )}
          >
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-[14px]',
                moreOpen ? 'bg-navy text-gold' : 'bg-transparent',
              )}
            >
              <Icon name="fa-solid fa-bars" />
            </span>
            المزيد
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="h-[78vh] rounded-t-[22px] border-none bg-navy p-0 text-white">
          <SheetHeader className="border-b border-white/[.08] px-4 py-3.5 text-right">
            <div className="flex items-center gap-2.5">
              <Image
                src="/assets/talal-symbol-light.png"
                alt=""
                width={30}
                height={30}
                className="object-contain"
              />
              <div>
                <SheetTitle className="font-display text-[15px] font-bold text-white">
                  بوابة المعلم
                </SheetTitle>
                <p className="text-[11px] text-gold">طلال أكاديمي</p>
              </div>
            </div>
          </SheetHeader>
          <MoreSheetLinks onNavigate={() => setMoreOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
