'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  NAV_GROUPS,
  NAV_HOME,
  NAV_MY_PORTAL,
  isNavItemActive,
  isNavItemVisible,
  type NavGroup,
  type NavItem,
} from '@/config/nav';
import { isTeacherOnly } from '@/lib/dashboard-routes';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const EMPTY_PERMISSIONS: string[] = [];

function linkClass(active: boolean, nested = false) {
  return cn(
    'flex items-center gap-3 rounded-xl transition-all',
    nested ? 'px-3 py-2 text-[13px]' : 'px-3 py-2.5 text-[13.5px]',
    active
      ? 'bg-gold/[.16] font-bold text-gold-soft shadow-[inset_3px_0_0_#c8a24a]'
      : 'font-medium text-muted-nav hover:bg-gold/[.12] hover:text-gold-soft',
  );
}

function NavLink({
  item,
  pathname,
  onNavigate,
  nested,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
  nested?: boolean;
}) {
  const active = isNavItemActive(pathname, item.href);
  return (
    <Link href={item.href} onClick={onNavigate} className={linkClass(active, nested)}>
      <Icon name={item.icon} className={cn('text-center', nested ? 'w-3.5 text-[12px]' : 'w-4 text-[13.5px]')} />
      {item.title}
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
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

  const activeGroupId = useMemo(() => {
    for (const group of visibleGroups) {
      if (group.items.some((item) => isNavItemActive(pathname, item.href))) {
        return group.id;
      }
    }
    return null;
  }, [pathname, visibleGroups]);

  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!activeGroupId) return;
    setOpenIds((prev) => {
      if (prev[activeGroupId]) return prev;
      return { ...prev, [activeGroupId]: true };
    });
  }, [activeGroupId]);

  function toggle(id: string) {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const teacherOnly = isTeacherOnly(user);
  const showHome = isNavItemVisible(NAV_HOME, permissions, roles);
  const showMyPortalLink = isNavItemVisible(NAV_MY_PORTAL, permissions, roles);

  return (
    <nav className="flex flex-1 flex-col gap-[3px] overflow-y-auto p-2.5">
      {teacherOnly ? (
        showMyPortalLink ? (
          <NavLink item={NAV_MY_PORTAL} pathname={pathname} onNavigate={onNavigate} />
        ) : null
      ) : (
        <>
          {showHome ? (
            <NavLink item={NAV_HOME} pathname={pathname} onNavigate={onNavigate} />
          ) : null}
          {showMyPortalLink ? (
            <NavLink item={NAV_MY_PORTAL} pathname={pathname} onNavigate={onNavigate} />
          ) : null}
        </>
      )}

      {visibleGroups.map((group: NavGroup & { items: NavItem[] }) => {
        const open = Boolean(openIds[group.id]);
        const groupActive = group.id === activeGroupId;

        return (
          <div key={group.id} className="mt-0.5">
            <button
              type="button"
              onClick={() => toggle(group.id)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[12.5px] transition-all',
                groupActive
                  ? 'font-bold text-gold-soft'
                  : 'font-semibold text-[#8a97b3] hover:bg-gold/[.08] hover:text-gold-soft',
              )}
              aria-expanded={open}
            >
              <Icon name={group.icon} className="w-4 text-center text-[12.5px]" />
              <span className="flex-1 text-right">{group.title}</span>
              <Icon
                name="fa-solid fa-chevron-down"
                className={cn(
                  'text-[10px] transition-transform duration-200',
                  open ? 'rotate-180' : 'rotate-0',
                )}
              />
            </button>

            {open ? (
              <div className="mt-0.5 mr-1 flex flex-col gap-[2px] border-r border-white/[.08] pr-1.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    onNavigate={onNavigate}
                    nested
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

function Brand() {
  const user = useAuthStore((s) => s.user);
  const teacherOnly = isTeacherOnly(user);

  return (
    <div className="flex items-center gap-2.5 border-b border-white/[.07] px-4 py-4">
      <Image
        src="/assets/talal-symbol-light.png"
        alt=""
        width={34}
        height={34}
        className="object-contain"
      />
      <div className="leading-tight">
        <div className="font-display text-[15px] font-bold text-white">طلال أكاديمي</div>
        <div className="mt-0.5 text-[10px] font-bold tracking-wide text-gold">
          {teacherOnly ? 'بوابة المعلم' : 'ADMIN PANEL'}
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[246px] shrink-0 flex-col border-l border-gold/20 bg-navy lg:flex">
      <Brand />
      <NavLinks />
      <div className="font-latin border-t border-white/[.07] px-3.5 py-3 text-[10px] text-[#5d6b8a]">
        v1.0 · الكويت
      </div>
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center justify-between border-b border-cream-line bg-[#fffefb] px-3.5 py-3 lg:hidden">
      <div className="flex items-center gap-2">
        <Image src="/assets/talal-symbol.png" alt="" width={28} height={28} />
        <div>
          <div className="font-display text-[14px] font-bold text-navy-800">طلال أكاديمي</div>
          <div className="font-latin text-[8px] tracking-[.2em] text-gold">ADMIN</div>
        </div>
      </div>
      <button
        type="button"
        aria-label="القائمة"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-[11px] border border-cream-line bg-white text-ink-dim"
      >
        <Icon name="fa-solid fa-bars" className="text-[14px]" />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[246px] border-none bg-navy p-0 text-white">
          <SheetHeader className="sr-only">
            <SheetTitle>القائمة</SheetTitle>
          </SheetHeader>
          <Brand />
          <NavLinks onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
