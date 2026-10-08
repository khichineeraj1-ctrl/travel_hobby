import type { Metadata } from 'next';

// Runtime-resolved (not inlined at build): SITE_URL > NEXT_PUBLIC_SITE_URL > Railway's public domain > fallback
export const SITE_URL = (
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'http://localhost:3030')
).replace(/\/$/, '');
export const SITE_NAME = 'Beyond Explored';
export const TAGLINE = 'get lost, on purpose';

export const abs = (path: string) => `${SITE_URL}${path.startsWith('/') ? path : '/' + path}`;

/** Google shows ~60 title chars and ~155 description chars on mobile — stay inside that. */
export const fitDescription = (d: string, max = 158) => {
  const s = d.replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20)).replace(/[\s,.;:—–-]+$/, '') + '…';
};

export function meta(opts: { title: string; description: string; path: string; noindex?: boolean; image?: string; imageSize?: { width: number; height: number }; article?: { published: string; modified: string; author: string } }): Metadata {
  const url = abs(opts.path);
  const suffix = ` · ${SITE_NAME}`;
  const description = fitDescription(opts.description);
  return {
    // add the brand only when it still fits in ~60 chars
    title: opts.title.length + suffix.length <= 62 ? opts.title : { absolute: opts.title },
    description,
    alternates: { canonical: url },
    // large image previews + full snippets help Discover and AI answers quote us
    robots: opts.noindex ? { index: false, follow: true } : { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
    // default share card (place/event/road-trip pages override it with their own generated image)
    openGraph: {
      images: [{ url: abs(opts.image ?? '/opengraph-image'), ...(opts.imageSize ?? { width: 1200, height: 630 }) }], title: opts.title, description, url, siteName: SITE_NAME, locale: 'en_IN',
      ...(opts.article ? { type: 'article' as const, publishedTime: opts.article.published, modifiedTime: opts.article.modified, authors: [opts.article.author] } : { type: 'website' as const }),
    },
    twitter: { card: 'summary_large_image', title: opts.title, description, images: [abs(opts.image ?? '/opengraph-image')] },
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.path) })),
  };
}

export function itemListLd(name: string, items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, url: abs(it.path) })),
  };
}
