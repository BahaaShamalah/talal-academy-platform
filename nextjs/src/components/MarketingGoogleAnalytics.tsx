'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

/** Loads GA only on public marketing pages — never portal/account/admin shells. */
export function MarketingGoogleAnalytics({ measurementId }: { measurementId: string }) {
  const pathname = usePathname() || '/';
  const skip =
    pathname.startsWith('/portal') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/teacher');

  if (skip || !measurementId.trim()) {
    return null;
  }

  const id = measurementId.trim();

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${id}');
      `}</Script>
    </>
  );
}
