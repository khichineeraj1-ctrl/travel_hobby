import type { MetadataRoute } from 'next';
import { abs } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/plan', '/roll', '/admin', '/book', '/booking'] }],
    sitemap: abs('/sitemap.xml'),
  };
}
