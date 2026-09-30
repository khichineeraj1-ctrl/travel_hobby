import type { MetadataRoute } from 'next';
import { getAllDestinations, getCities, getStates, getVibes } from '@/lib/repo';
import { MONTHS } from '@/lib/months';
import { abs } from '@/lib/seo';
import { readDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const u = (path: string, priority: number, changeFrequency: 'daily' | 'weekly' | 'monthly' = 'weekly') => ({
    url: abs(path), lastModified: now, changeFrequency, priority,
  });
  return [
    u('/', 1, 'daily'),
    u('/places', 0.8),
    u('/trips', 0.9, 'daily'),
    u('/events', 0.9, 'daily'),
    u('/road-trips', 0.9),
    ...readDb().events.filter((e) => e.status === 'published').map((e) => u(`/events/${e.slug}`, 0.8)),
    ...readDb().roadTrips.filter((t) => t.published).map((t) => u(`/road-trips/${t.slug}`, 0.85)),
    u('/plan-my-trip', 0.7),
    u('/partners', 0.4, 'monthly'),
    u('/vibe', 0.6), u('/from', 0.6), u('/when', 0.6), u('/state', 0.6),
    ...getAllDestinations().map((d) => u(`/places/${d.slug}`, 0.9)),
    ...getCities().map((c) => u(`/from/${c.slug}`, 0.8)),
    ...getVibes().map((v) => u(`/vibe/${v.id}`, 0.7)),
    ...MONTHS.map((m) => u(`/when/${m}`, 0.7, 'monthly')),
    ...['solo', 'duo', 'squad', 'fam'].map((c) => u(`/for/${c}`, 0.7)),
    ...getStates().map((s) => u(`/state/${s.slug}`, 0.7)),
  ];
}
