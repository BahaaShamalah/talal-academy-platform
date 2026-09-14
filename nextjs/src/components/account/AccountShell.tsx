'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { Guardian } from '@/lib/account';
import { unwrapOne } from '@/lib/account';
import { cn } from '@/lib/cn';
import Icon from '@/components/ui/Icon';

const links = [
  { href: '/portal/children', label: 'أبنائي', icon: 'fa-solid fa-children', exact: true },
  { href: '/schedule', label: 'الجدول', icon: 'fa-solid fa-calendar-week' },
  { href: '/account/invoices', label: 'الفواتير', icon: 'fa-solid fa-file-invoice' },
  { href: '/portal/private-lessons', label: 'حصص خاصة', icon: 'fa-solid fa-user-graduate' },
  { href: '/account/profile', label: 'حسابي', icon: 'fa-solid fa-user' },
];

export default function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [guardian, setGuardian] = useState<Guardian | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/guardian/me');
    if (!res.ok) {
      router.replace('/?auth=1');
      return;
    }
    setGuardian(unwrapOne<Guardian>(await res.json()));
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/');
    }
  }

  const name = guardian?.full_name?.trim() || 'ولي الأمر';

  return (
    <div className="min-h-svh bg-[#f4f0e6] text-[#1c1a17]">
      <header className="border-b border-[#e5dfd0] bg-navy-800 text-white">
        <div className="mx-auto flex max-w-[960px] items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div>
            <p className="text-[11px] text-gold-soft/80">بوابة ولي الأمر</p>
            <h1 className="text-[17px] font-extrabold">{name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden rounded-full border border-white/15 px-3 py-1.5 text-[12.5px] text-[#d9d3c4] sm:inline-flex"
            >
              الموقع
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              disabled={loggingOut}
              className="rounded-full border border-gold/40 px-3.5 py-1.5 text-[12.5px] font-bold text-gold"
            >
              {loggingOut ? '…' : 'تسجيل خروج'}
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-[960px] gap-1 overflow-x-auto px-4 pb-3 sm:px-6">
          {links.map((l) => {
            const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px]',
                  active ? 'bg-gold text-navy font-extrabold' : 'bg-white/5 text-[#d9d3c4]',
                )}
              >
                <Icon name={l.icon} className="text-[12px]" />
                {l.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-[960px] px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
