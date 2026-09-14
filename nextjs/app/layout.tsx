import type { Metadata, Viewport } from 'next';
import { Cairo, El_Messiri, Space_Grotesk } from 'next/font/google';
import './globals.css';

const cairo = Cairo({ subsets: ['arabic', 'latin'], weight: ['400', '600', '700', '800', '900'], variable: '--font-cairo', display: 'swap' });
const messiri = El_Messiri({ subsets: ['arabic', 'latin'], weight: ['500', '600', '700'], variable: '--font-messiri', display: 'swap' });
const grotesk = Space_Grotesk({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-grotesk', display: 'swap' });

export const metadata: Metadata = {
  title: 'طلال أكاديمي | تعليم حضوري ومتابعة لأبنائك في الكويت',
  description:
    'طلال أكاديمي يقدم برامج تعليمية حضورية لطلاب المراحل الابتدائية والمتوسطة والثانوية مع متابعة مستمرة وحل الواجبات ومراجعة الاختبارات.',
  openGraph: {
    title: 'طلال أكاديمي',
    description: 'تعليم حضوري ومتابعة مستمرة — الكويت',
    locale: 'ar_KW',
    type: 'website',
  },
  icons: { icon: '/assets/talal-symbol.png' },
};

export const viewport: Viewport = {
  themeColor: '#061a3a',
  width: 'device-width',
  initialScale: 1,
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
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
