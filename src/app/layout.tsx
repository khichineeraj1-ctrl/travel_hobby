import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SITE_NAME, SITE_URL, TAGLINE } from '@/lib/seo';
import { getLang } from '@/lib/i18n';
import { langInfo } from '@/lib/langs';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: Offbeat India Places & Trip Planner`, template: `%s · ${SITE_NAME}` },
  description:
    'Find offbeat, uncrowded places in India. Real travel times from your city, live weather, honest costs and the best month to go — solo, squad or family.',
  applicationName: SITE_NAME,
};

export const viewport: Viewport = { themeColor: '#f5f5f7', width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={langInfo(lang).hreflang} className={lang === 'en' ? undefined : 'be-tr-pending'} suppressHydrationWarning>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
