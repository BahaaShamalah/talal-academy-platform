'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { ViewId } from '@/types';
import Button from './ui/Button';
import { cn } from '@/lib/cn';
import { useMarketing } from './MarketingProvider';
import { useSection } from '@/lib/marketing';
import type { Guardian } from '@/lib/account';
import { unwrapOne } from '@/lib/account';
import PortalNotifications from './portal/PortalNotifications';
import PortalUserMenu from './portal/PortalUserMenu';

type NavContent = {
  institute_name_ar: string;
  institute_name_en: string;
  header_cta_primary: string;
  header_cta_secondary: string;
  nav_items: { view_id: ViewId; label: string; icon?: string }[];
};

export default function Header({
  view,
  onNavigate,
  onRegister,
  onLogin,
}: {
  view: ViewId;
  onNavigate: (v: ViewId) => void;
  onRegister: () => void;
  onLogin: () => void;
}) {
  const nav = useSection<NavContent>(useMarketing(), 'nav');
  const [scrolled, setScrolled] = useState(false);
  const [guardian, setGuardian] = useState<Guardian | null | undefined>(undefined);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadGuardian() {
      try {
        const res = await fetch('/api/guardian/me', { cache: 'no-store' });
        if (cancelled) return;
        if (!res.ok) {
          setGuardian(null);
          return;
        }
        setGuardian(unwrapOne<Guardian>(await res.json()));
      } catch {
        if (!cancelled) setGuardian(null);
      }
    }
    void loadGuardian();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!nav) return null;

  const loggedIn = Boolean(guardian);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b bg-navy backdrop-blur-md transition-all duration-300',
        scrolled ? 'border-gold/40 shadow-[0_12px_34px_-20px_rgba(0,0,0,.55)]' : 'border-gold/[.18]',
      )}
    >
      <div className="mx-auto flex h-[70px] w-full max-w-[1560px] items-center justify-between gap-4 px-4 sm:px-10">
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5"
          aria-label={nav.institute_name_ar}
        >
          <span className="flex flex-col text-right leading-none">
            <b className="text-[19px] font-extrabold">{nav.institute_name_ar}</b>
            <span className="mt-1 font-[Marcellus,serif] text-[8px] tracking-[.24em] text-gold-soft">
              {nav.institute_name_en}
            </span>
          </span>
          <Image src="/assets/talal-symbol-light.png" alt="" width={40} height={40} className="object-contain" />
        </button>

        <nav className="hidden flex-1 items-center justify-center gap-[clamp(12px,1.8vw,26px)] text-[15px] lg:flex">
          {(nav.nav_items ?? []).map((n) => (
            <button
              key={n.view_id}
              onClick={() => onNavigate(n.view_id)}
              className={cn(
                'transition-colors',
                view === n.view_id
                  ? 'font-extrabold text-gold'
                  : 'font-medium text-muted-nav hover:text-gold',
              )}
            >
              {n.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          {guardian === undefined ? (
            <div className="h-9 w-28 animate-pulse rounded-full bg-white/10" aria-hidden />
          ) : loggedIn ? (
            <>
              <PortalNotifications tone="dark" />
              <PortalUserMenu
                tone="dark"
                guardian={guardian}
                onLoggedOut={() => setGuardian(null)}
              />
            </>
          ) : (
            <>
              <Button size="sm" onClick={onRegister}>
                {nav.header_cta_primary}
              </Button>
              <Button variant="ghost" size="sm" onClick={onLogin} className="hidden md:inline-flex">
                {nav.header_cta_secondary}
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
