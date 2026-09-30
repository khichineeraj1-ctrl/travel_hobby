import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SITE_NAME, SITE_URL, TAGLINE } from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — ${TAGLINE}. Offbeat India, zero itinerary`, template: `%s · ${SITE_NAME}` },
  description:
    'Discover offbeat, less-travelled places in India. Tell us your days, budget, crew and vibe — get hidden spots with real travel time, live weather and the best time to go.',
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
