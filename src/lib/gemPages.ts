/**
 * Every Google-sourced spot we know (all-India hidden gems + best spots around our places) gets its own
 * page on our site at /gems/<slug>, so a click keeps people here instead of throwing them to Google Maps.
 */
import { readDb } from './db';
import { INDIA_STATES, allGems } from './gems';
import { family, km, spotsFor } from './places';
import { getAllDestinations, getCities } from './repo';
import { STATE_SEASON, WATERFALL_MONTHS } from '@/data/state-seasons';
import type { Destination, Gem, Month } from './types';

export type GemPage = Gem & { slug: string; stateName: string; family: string; months: Month[]; monthsFrom: 'state' | 'waterfall'; nearDest?: string };

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

let memo: { at: number; mtime: string; list: GemPage[]; bySlug: Map<string, GemPage>; byId: Map<string, GemPage> } | null = null;

export function gemIndex() {
  const db = readDb();
  const stamp = `${db.gemsMeta?.lastRun ?? ''}|${db.spotMeta?.lastRun ?? ''}|${(db.hiddenSpots ?? []).length}`;
  if (memo && memo.mtime === stamp && Date.now() - memo.at < 5 * 60_000) return memo;
  const stateName = (slug: string) => INDIA_STATES.find((s) => s.slug === slug)?.name ?? slug;
  const raw = new Map<string, Gem & { nearDest?: string }>();
  for (const g of allGems()) raw.set(g.id, g);
  // spots around our own places become pages too (only Google ones — they have ratings & stable ids)
  for (const d of getAllDestinations()) {
    for (const s of spotsFor(d.slug)) {
      if (s.src !== 'google' || raw.has(s.id)) continue;
      raw.set(s.id, { ...s, stateSlug: d.stateSlug, area: s.distKm < 1 ? d.name : `${s.distKm} km from ${d.name}`, nearDest: d.slug });
    }
  }
  const used = new Set<string>();
  const list: GemPage[] = [...raw.values()].map((g) => {
    let slug = slugify(`${g.name} ${stateName(g.stateSlug)}`) || 'spot';
    if (used.has(slug)) slug = `${slug}-${g.id.slice(-5).toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    used.add(slug);
    const isFall = /fall|waterfall|jharna/i.test(`${g.kind} ${g.name}`);
    return {
      ...g, slug, stateName: stateName(g.stateSlug), family: family(g.kind, g.name),
      months: isFall ? WATERFALL_MONTHS : (STATE_SEASON[g.stateSlug] ?? []), monthsFrom: isFall ? 'waterfall' : 'state',
    };
  });
  memo = { at: Date.now(), mtime: stamp, list, bySlug: new Map(list.map((g) => [g.slug, g])), byId: new Map(list.map((g) => [g.id, g])) };
  return memo;
}

export const gemBySlug = (slug: string) => gemIndex().bySlug.get(slug);
export const gemHref = (id: string) => { const g = gemIndex().byId.get(id); return g ? `/gems/${g.slug}` : undefined; };

export function nearbyGems(g: GemPage, limit = 6) {
  const all = gemIndex().list.filter((x) => x.id !== g.id);
  const close = all.map((x) => ({ x, d: km(g, x) })).filter((r) => r.d <= 80).sort((a, b) => a.d - b.d).map((r) => ({ ...r.x, distKm: Math.round(r.d) }));
  if (close.length >= 3) return close.slice(0, limit);
  const rest = all.filter((x) => x.stateSlug === g.stateSlug && !close.some((c) => c.id === x.id)).map((x) => ({ ...x, distKm: Math.round(km(g, x)) })).sort((a, b) => a.distKm - b.distKm);
  return [...close, ...rest].slice(0, limit);
}

/** Our full guide nearest to this gem (if any within ~150 km) — the natural base for a trip. */
export function nearestGuide(g: GemPage): { d: Destination; km: number } | undefined {
  const best = getAllDestinations().map((d) => ({ d, km: Math.round(km(g, d)) })).sort((a, b) => a.km - b.km)[0];
  return best && best.km <= 150 ? best : undefined;
}

/** Nearest big city we track (and nearest one with an airport). */
export function nearestCities(g: GemPage) {
  const cs = getCities().map((c) => ({ c, km: Math.round(km(g, c)) })).sort((a, b) => a.km - b.km);
  return { city: cs[0], airport: cs.find((x) => x.c.hasAirport) };
}

export const gemCount = () => gemIndex().list.length;
export const _db = readDb; // keep tree-shaking honest for server-only usage

/** Shape a gem for <GemCard>/<GemTile>. */
export const asCard = (g: GemPage & { distKm?: number }, area?: string) => ({
  id: g.id, name: g.name, kind: g.kind, family: g.family, stateName: g.stateName, area: area ?? g.area,
  rating: g.rating, reviews: g.reviews, gem: g.gem, months: g.months, href: `/gems/${g.slug}`,
});

/** Card props for any Gem/Spot we hold (looked up so it links to its on-site page). */
export function cardOf(s: { id: string }, area?: string) {
  const g = gemIndex().byId.get(s.id);
  return g ? asCard(g, area) : undefined;
}
