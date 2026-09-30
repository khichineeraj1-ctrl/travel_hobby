import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SITE_NAME, SITE_URL, TAGLINE } from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: Offbeat India Places & Trip Planner`, template: `%s · ${SITE_NAME}` },
  description:
    'Find offbeat, uncrowded places in India. Real travel times from your city, live weather, honest costs and the best month to go — solo, squad or family.',
  applicationName: SITE_NAME,
};

export const viewport: Viewport = { themeColor: '#f5f5f7', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
