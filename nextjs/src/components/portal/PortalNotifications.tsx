'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../ui/Icon';
import { unwrapList } from '@/lib/account';
import { formatDateAr } from '@/lib/portal';
import { cn } from '@/lib/cn';

type Note = {
  id: number;
  subject: string | null;
  body: string | null;
  is_read: boolean;
  created_at?: string;
};

type Props = {
  tone?: 'light' | 'dark';
};

export default function PortalNotifications({ tone = 'light' }: Props) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Note[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);
  const dark = tone === 'dark';

  const unread = rows.filter((n) => !n.is_read).length;

  const load = useCallback(async () => {
    const res = await fetch('/api/guardian/me/notifications?per_page=12', { cache: 'no-store' });
    if (res.ok) setRows(unwrapList<Note>(await res.json()));
  }, []);

  useEffect(() => {
    void load();
    function onFocus() {
      if (document.visibilityState === 'visible') void load();
    }
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    const id = window.setInterval(() => void load(), 60_000);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  async function markRead(id: number) {
    setRows((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await fetch(`/api/guardian/notifications/${id}/mark-read`, { method: 'POST' });
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        aria-label="الإشعارات"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative flex h-[37px] w-[37px] items-center justify-center rounded-xl border text-[15px] transition-colors',
          dark
            ? 'border-gold/25 bg-white/[.06] text-gold-soft hover:border-gold/45 hover:bg-white/[.1]'
            : 'border-cream-line bg-white text-ink-dim',
        )}
      >
        <Icon name="fa-regular fa-bell" />
        {unread > 0 ? (
          <span
            className={cn(
              'absolute flex items-center justify-center rounded-full bg-gold font-bold text-navy',
              unread > 9
                ? 'left-0.5 top-0.5 h-4 min-w-4 px-0.5 text-[9px]'
                : 'left-1.5 top-1.5 h-[8px] w-[8px]',
            )}
          >
            {unread > 9 ? (unread > 99 ? '99+' : unread) : null}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute left-0 top-[46px] z-40 w-[min(340px,calc(100vw-32px))] overflow-hidden rounded-[16px] border border-cream-line bg-white shadow-[0_18px_40px_-24px_rgba(11,35,74,.55)]">
          <div className="flex items-center justify-between border-b border-[#f0ece1] px-4 py-3">
            <span className="text-[13px] font-bold text-navy-800">الإشعارات</span>
            {unread > 0 ? (
              <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-bold text-[#8a6a20]">
                {unread} جديد
              </span>
            ) : null}
          </div>
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-ink-dim">لا توجد إشعارات.</p>
          ) : (
            <ul className="max-h-[320px] overflow-y-auto">
              {rows.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void markRead(n.id)}
                    className={cn(
                      'w-full px-4 py-3 text-right',
                      n.is_read ? 'bg-white' : 'bg-[#fbf7ef]',
                    )}
                  >
                    <div className="text-[13px] font-bold text-navy-800">{n.subject || 'إشعار'}</div>
                    {n.body ? (
                      <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-ink-dim">
                        {n.body}
                      </p>
                    ) : null}
                    <div className="mt-1 text-[11px] text-ink-faint">{formatDateAr(n.created_at)}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
