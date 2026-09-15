import type { Metadata, Viewport } from 'next';
import { Cairo, El_Messiri, Space_Grotesk } from 'next/font/google';
import { AuthProvider } from '@/components/auth/auth-provider';
import { Providers } from '@/components/providers';
import { getApiBaseUrl } from '@/lib/auth';
import './globals.css';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '600', '700', '800', '900'],
  variable: '--font-cairo',
  display: 'swap',
});

const messiri = El_Messiri({
  subsets: ['arabic', 'latin'],
  weight: ['500', '600', '700'],
  variable: '--font-messiri',
  display: 'swap',
});

const grotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-grotesk',
  display: 'swap',
});

const DEFAULT_TITLE = 'طلال أكاديمي | لوحة التحكم';
const DEFAULT_DESCRIPTION = 'لوحة التحكم الإدارية — طلال أكاديمي';
const DEFAULT_FAVICON = '/assets/talal-symbol.png';

type PublicSeoSettings = {
  seo_title?: string | null;
  favicon_url?: string | null;
};

async function fetchPublicSeoSettings(): Promise<PublicSeoSettings | null> {
  const backend = getApiBaseUrl();
  try {
    const res = await fetch(`${backend}/api/v1/public/seo-settings`, {
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
  const favicon = seo?.favicon_url?.trim() || DEFAULT_FAVICON;

  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    icons: { icon: favicon },
  };
}

export const viewport: Viewport = {
  themeColor: '#061a3a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${messiri.variable} ${grotesk.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
        />
      </head>
      <body className="min-h-screen bg-cream text-ink antialiased" suppressHydrationWarning>
        <Providers>
          <AuthProvider>{children}</AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
