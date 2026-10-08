import type { MetadataRoute } from 'next';
import { getAllDestinations, getCities, getStates, getVibes } from '@/lib/repo';
import { MONTHS } from '@/lib/months';
import { abs } from '@/lib/seo';
import { LANGS, withLang } from '@/lib/langs';
import { readDb } from '@/lib/db';
import { INDIA_STATES, gemsFor } from '@/lib/gems';
import { allNotes } from '@/lib/notes';
import { getAuthors } from '@/lib/authors';

export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  // every page exists in each language at /<lang>/… — list them as hreflang alternates
  const u = (path: string, priority: number, changeFrequency: 'daily' | 'weekly' | 'monthly' = 'weekly') => ({
    url: abs(path), lastModified: now, changeFrequency, priority,
    alternates: { languages: Object.fromEntries(LANGS.map((l) => [l.hreflang, abs(withLang(l.code, path))])) },
  });
  return [
    u('/', 1, 'daily'),
    u('/places', 0.8),
    u('/spots', 0.8),
    u('/explore', 0.9, 'daily'),
    u('/hidden-gems', 0.9),
    ...INDIA_STATES.filter((s) => gemsFor(s.slug).length).map((s) => u(`/hidden-gems/${s.slug}`, 0.8)),
    u('/notes', 0.7),
    u('/authors', 0.4, 'monthly'),
    u('/contribute', 0.4, 'monthly'),
    ...getAuthors().map((a) => u(`/authors/${a.slug}`, 0.5, 'monthly')),
    ...allNotes().map((n) => u(`/notes/${n.slug}`, 0.85)),
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
