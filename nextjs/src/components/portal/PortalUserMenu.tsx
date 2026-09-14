'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '../ui/Icon';
import {
  clearPortalProfileCache,
  usePortalOptional,
} from './PortalProvider';
import type { Guardian } from '@/lib/account';
import { personInitials, portalNav } from '@/lib/portal';
import { cn } from '@/lib/cn';

type Props = {
  /** light = portal cream header; dark = marketing navy header */
  tone?: 'light' | 'dark';
  guardian?: Guardian | null;
  onLoggedOut?: () => void;
};

export default function PortalUserMenu({
  tone = 'light',
  guardian: guardianProp,
  onLoggedOut,
}: Props) {
  const portal = usePortalOptional();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const guardian = guardianProp ?? portal?.guardian ?? null;
  const name = guardian?.full_name?.trim() || 'ولي الأمر';
  const phone = guardian?.phone?.trim() || '';
  const avatarUrl = guardian?.avatar_url || null;
  const dark = tone === 'dark';

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    setLoggingOut(true);
    clearPortalProfileCache();
    try {
      if (portal?.logout) {
        await portal.logout();
      } else {
        await fetch('/api/auth/logout', { method: 'POST' });
        onLoggedOut?.();
        router.replace('/');
        router.refresh();
      }
    } finally {
      setLoggingOut(false);
    }
  }

  if (!guardian) return null;

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2.5 rounded-full border py-1 pe-1 ps-2.5 transition-colors',
          dark
            ? cn(
                'border-transparent text-white hover:border-gold/35 hover:bg-white/[.06]',
                open && 'border-gold/40 bg-white/[.08]',
              )
            : cn(
                'border-transparent hover:border-cream-line hover:bg-white',
                open && 'border-cream-line bg-white',
              ),
        )}
      >
        <div className="hidden text-left leading-tight sm:block">
          <div
            className={cn(
              'max-w-[140px] truncate text-[12.5px] font-bold',
              dark ? 'text-white' : 'text-navy-800',
            )}
          >
            {name}
          </div>
          <div className={cn('text-[11px]', dark ? 'text-gold-soft/90' : 'text-ink-dim')}>
            ولي أمر
          </div>
        </div>
        <span className="relative flex h-[37px] w-[37px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy-800 text-[12.5px] font-bold text-gold-soft ring-1 ring-gold/30">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            personInitials(name)
          )}
        </span>
        <Icon
          name="fa-solid fa-chevron-down"
          className={cn(
            'me-1 hidden text-[10px] transition-transform sm:inline',
            dark ? 'text-gold-soft/80' : 'text-ink-dim',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-[48px] z-40 w-[min(300px,calc(100vw-24px))] overflow-hidden rounded-[16px] border border-cream-line bg-white shadow-[0_18px_40px_-24px_rgba(11,35,74,.55)]"
        >
          <div className="flex items-center gap-3 border-b border-[#f0ece1] px-4 py-3.5">
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy-800 text-[13px] font-bold text-gold-soft">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                personInitials(name)
              )}
            </span>
            <div className="min-w-0 text-right">
              <div className="truncate text-[13.5px] font-bold text-navy-800">{name}</div>
              {phone ? (
                <div className="mt-0.5 truncate text-[11.5px] text-ink-dim" dir="ltr">
                  {phone}
                </div>
              ) : null}
            </div>
          </div>

          <div className="max-h-[min(60vh,420px)] overflow-y-auto p-1.5">
            {portalNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-navy-800 hover:bg-cream-soft"
              >
                <Icon name={item.icon} className="w-4 text-center text-[12px] text-ink-dim" />
                {item.label}
              </Link>
            ))}
            <div className="my-1 border-t border-[#f0ece1]" />
            <Link
              href="/portal/account"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-navy-800 hover:bg-cream-soft"
            >
              <Icon name="fa-solid fa-user" className="w-4 text-center text-[12px] text-ink-dim" />
              بيانات الحساب
            </Link>
            <Link
              href="/portal/account#avatar"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-navy-800 hover:bg-cream-soft"
            >
              <Icon name="fa-solid fa-camera" className="w-4 text-center text-[12px] text-ink-dim" />
              الصورة الشخصية
            </Link>
          </div>

          <div className="border-t border-[#f0ece1] p-1.5">
            <button
              type="button"
              role="menuitem"
              disabled={loggingOut || portal?.loggingOut}
              onClick={() => void handleLogout()}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[#a34b4b] hover:bg-[#fdf4f4]"
            >
              <Icon name="fa-solid fa-arrow-right-from-bracket" className="w-4 text-center text-[12px]" />
              {loggingOut || portal?.loggingOut ? 'جاري الخروج…' : 'تسجيل الخروج'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
