import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Cairo, El_Messiri, Space_Grotesk } from 'next/font/google';
import { MarketingGoogleAnalytics } from '@/components/MarketingGoogleAnalytics';
import { MarketingVisitTracker } from '@/components/MarketingVisitTracker';
import './globals.css';

const cairo = Cairo({ subsets: ['arabic', 'latin'], weight: ['400', '600', '700', '800', '900'], variable: '--font-cairo', display: 'swap' });
const messiri = El_Messiri({ subsets: ['arabic', 'latin'], weight: ['500', '600', '700'], variable: '--font-messiri', display: 'swap' });
const grotesk = Space_Grotesk({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-grotesk', display: 'swap' });

const DEFAULT_TITLE = 'طلال أكاديمي | تعليم حضوري ومتابعة لأبنائك في الكويت';
const DEFAULT_DESCRIPTION =
  'طلال أكاديمي يقدم برامج تعليمية حضورية لطلاب المراحل الابتدائية والمتوسطة والثانوية مع متابعة مستمرة وحل الواجبات ومراجعة الاختبارات.';
const DEFAULT_OG_TITLE = 'طلال أكاديمي';
const DEFAULT_FAVICON = '/assets/talal-symbol.png';

type PublicSeoSettings = {
  seo_title?: string | null;
  seo_description?: string | null;
  favicon_url?: string | null;
  og_image_url?: string | null;
  google_analytics_id?: string | null;
  google_search_console_verification?: string | null;
};

async function fetchPublicSeoSettings(): Promise<PublicSeoSettings | null> {
  const backend = process.env.BACKEND_URL ?? 'http://127.0.0.1:8000';
  try {
    const res = await fetch(`${backend}/api/v1/public/seo-settings`, {
      // Always fresh: admin may set Search Console / GA without redeploying.
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicSeoSettings;
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const seo = await fetchPublicSeoSettings();

  const title = seo?.seo_title?.trim() || DEFAULT_TITLE;
  const description = seo?.seo_description?.trim() || DEFAULT_DESCRIPTION;
  const favicon = seo?.favicon_url?.trim() || DEFAULT_FAVICON;
  const ogImage = seo?.og_image_url?.trim() || undefined;
  const ogTitle = seo?.seo_title?.trim() || DEFAULT_OG_TITLE;
  const searchConsole = seo?.google_search_console_verification?.trim() || undefined;

  const metadataBase = new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.FRONTEND_URL ?? 'http://localhost:3000',
  );

  return {
    metadataBase,
    title,
    description,
    icons: { icon: favicon },
    openGraph: {
      title: ogTitle,
      description,
      locale: 'ar_KW',
      type: 'website',
      ...(ogImage
        ? {
            images: [
              {
                url: ogImage,
                width: 1200,
                height: 630,
                alt: ogTitle,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    ...(searchConsole ? { verification: { google: searchConsole } } : {}),
  };
}

export const viewport: Viewport = {
  themeColor: '#061a3a',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const seo = await fetchPublicSeoSettings();
  const analyticsId = seo?.google_analytics_id?.trim() || '';

  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${messiri.variable} ${grotesk.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
        />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Suspense fallback={null}>
          <MarketingVisitTracker />
        </Suspense>
        {analyticsId ? <MarketingGoogleAnalytics measurementId={analyticsId} /> : null}
      </body>
    </html>
  );
}
