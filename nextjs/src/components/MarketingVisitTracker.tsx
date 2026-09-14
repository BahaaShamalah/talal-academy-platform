'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const SKIP_PREFIXES = ['/portal', '/account', '/admin', '/teacher'];
const TRACK_URL = '/api/public/track-visit';

/** Fire-and-forget visit ping after paint — marketing pages only (same-origin). */
export function MarketingVisitTracker() {
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) {
      return;
    }

    const query = searchParams?.toString() ?? '';
    const key = `${pathname}?${query}`;
    if (lastKey.current === key) {
      return;
    }
    lastKey.current = key;

    const utm_source = searchParams?.get('utm_source') ?? undefined;
    const utm_medium = searchParams?.get('utm_medium') ?? undefined;
    const utm_campaign = searchParams?.get('utm_campaign') ?? undefined;

    const body = JSON.stringify({
      path: pathname,
      referrer: typeof document !== 'undefined' ? document.referrer || null : null,
      ...(utm_source ? { utm_source } : {}),
      ...(utm_medium ? { utm_medium } : {}),
      ...(utm_campaign ? { utm_campaign } : {}),
    });

    const send = () => {
      try {
        if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
          const blob = new Blob([body], { type: 'application/json' });
          if (navigator.sendBeacon(TRACK_URL, blob)) {
            return;
          }
        }
        void fetch(TRACK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body,
          keepalive: true,
          credentials: 'omit',
        }).catch(() => {});
      } catch {
        // never block UX
      }
    };

    const ric = (window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    }).requestIdleCallback;

    if (typeof ric === 'function') {
      const id = ric(send, { timeout: 2000 });
      return () => {
        (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id);
      };
    }

    const t = window.setTimeout(send, 0);
    return () => window.clearTimeout(t);
  }, [pathname, searchParams]);

  return null;
}
