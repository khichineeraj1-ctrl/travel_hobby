/**
 * "Best spots nearby" — real, mappable places around each destination.
 *
 * Provider (auto):
 *   - Google Places API (New) if GOOGLE_MAPS_API_KEY is set → ratings + review counts, ranked by quality
 *   - otherwise OpenStreetMap (Overpass API, free) → named viewpoints, waterfalls, peaks, lakes, forts…
 *   - PLACES_PROVIDER=off disables it
 *
 * Pages never call the API; they read db.spots. The cache refreshes in the background on boot,
 * daily for anything older than 25 days (Google's terms allow caching for up to 30), and when
 * an admin saves a place.
 */
import { readDb, updateDb } from './db';
import type { Destination, SiteSettings, Spot, SpotSet } from './types';
import { OVERPASS_MIRRORS, osmQuery } from './osmQuery';

const STALE_MS = 25 * 24 * 3600 * 1000;
const MAX_AGE_GOOGLE_MS = 30 * 24 * 3600 * 1000;
const KEEP = 12;
export const SPOT_DEFAULTS = { minRating: 4.2, minReviews: 30, radiusKm: 35 };

export function spotProvider(): 'google' | 'osm' | 'off' {
  const p = (process.env.PLACES_PROVIDER ?? '').toLowerCase();
  if (p === 'off') return 'off';
  if (p === 'osm') return 'osm';
  return process.env.GOOGLE_MAPS_API_KEY ? 'google' : 'osm';
}

export const rules = (s?: SiteSettings) => ({ ...SPOT_DEFAULTS, ...(s?.spots ?? {}) });

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const NOT_A_SPOT = /\b(hotel|resort|homestay|home stay|guest ?house|hostel|lodge|restaurant|dhaba|cafe|café|bar|atm|petrol|fuel|bank|hospital|school|office|shop|store|mart|parking|bus stand|taxi|travels|tours?|agency|camp(s|ing)? ?site)\b/i;

/** Spots to show for a destination (hidden ones removed, expired Google data dropped). */
export function spotsFor(slug: string): Spot[] {
  const db = readDb();
  const set = db.spots?.[slug];
  if (!set) return [];
  if (set.src === 'google' && Date.now() - new Date(set.at).getTime() > MAX_AGE_GOOGLE_MS) return [];
  const hidden = new Set(db.hiddenSpots ?? []);
  return set.spots.filter((s) => !hidden.has(s.id));
}

/* ---------------- Google Places API (New) ---------------- */

const FIELD_MASK = [
  'places.id', 'places.displayName', 'places.location', 'places.rating', 'places.userRatingCount',
  'places.primaryTypeDisplayName', 'places.googleMapsUri', 'places.businessStatus', 'places.types',
].join(',');

type GPlace = {
  id: string; displayName?: { text: string }; location?: { latitude: number; longitude: number };
  rating?: number; userRatingCount?: number; primaryTypeDisplayName?: { text: string };
  googleMapsUri?: string; businessStatus?: string; types?: string[];
};

async function gPost(path: string, body: unknown): Promise<GPlace[]> {
  const res = await fetch(`${process.env.GOOGLE_PLACES_BASE ?? 'https://places.googleapis.com/v1'}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY!, 'X-Goog-FieldMask': FIELD_MASK },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw Object.assign(new Error(`Google Places ${res.status}: ${j?.error?.message ?? res.statusText}`), { status: res.status });
  }
  return ((await res.json()).places ?? []) as GPlace[];
}

const NEARBY_TYPES = ['tourist_attraction', 'hiking_area', 'national_park', 'park', 'museum', 'historical_landmark'];

async function googleSpots(d: Destination, r: ReturnType<typeof rules>): Promise<Spot[]> {
  const radius = Math.min(50_000, r.radiusKm * 1000);
  const circle = { center: { latitude: d.lat, longitude: d.lng }, radius };
  const nearby = (types: string[]) =>
    gPost('places:searchNearby', { includedTypes: types, maxResultCount: 20, rankPreference: 'POPULARITY', locationRestriction: { circle }, languageCode: 'en', regionCode: 'IN' });
  let a: GPlace[];
  try {
    a = await nearby(NEARBY_TYPES);
  } catch (e) {
    if ((e as { status?: number }).status !== 400) throw e;
    a = await nearby(['tourist_attraction']); // older type tables reject some types
  }
  const b = await gPost('places:searchText', {
    textQuery: `best viewpoints, waterfalls, lakes, treks and hidden places near ${d.name}, ${d.state}`,
    pageSize: 20, locationBias: { circle }, languageCode: 'en', regionCode: 'IN',
  }).catch(() => [] as GPlace[]);

  const seen = new Map<string, Spot>();
  for (const p of [...a, ...b]) {
    if (!p.location || !p.displayName?.text || seen.has(p.id)) continue;
    if (p.businessStatus && p.businessStatus !== 'OPERATIONAL') continue;
    if (p.types?.some((t) => /lodging|restaurant|store|travel_agency|hotel|food/.test(t))) continue;
    const name = p.displayName.text;
    if (NOT_A_SPOT.test(name)) continue;
    const at = { lat: p.location.latitude, lng: p.location.longitude };
    const dist = km(d, at);
    if (dist > r.radiusKm * 1.2) continue;
    if (dist < 1 && name.toLowerCase().includes(d.name.toLowerCase())) continue; // the town itself
    const rating = p.rating ?? 0, reviews = p.userRatingCount ?? 0;
    if (rating < r.minRating || reviews < r.minReviews) continue;
    seen.set(p.id, {
      id: p.id, name, ...at, kind: p.primaryTypeDisplayName?.text ?? 'Attraction',
      rating, reviews, distKm: Math.round(dist * 10) / 10,
      mapsUrl: p.googleMapsUri ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${p.id}`,
      gem: rating >= 4.5 && reviews < 1500, src: 'google',
    });
  }
  // Bayesian quality: pull low-review ratings toward 4.0 so 5★ with 12 reviews doesn't beat 4.7★ with 3,000
  const q = (s: Spot) => ((s.reviews ?? 0) * (s.rating ?? 0) + 150 * 4.0) / ((s.reviews ?? 0) + 150);
  return [...seen.values()].sort((x, y) => q(y) - q(x)).slice(0, KEEP);
}

/* ---------------- OpenStreetMap (Overpass) ---------------- */

export type OsmEl = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };

const OSM_KIND: [string, string, string][] = [
  ['natural', 'waterfall', 'Waterfall'], ['natural', 'peak', 'Peak'], ['natural', 'glacier', 'Glacier'],
  ['natural', 'hot_spring', 'Hot spring'], ['natural', 'cave_entrance', 'Cave'], ['natural', 'beach', 'Beach'],
  ['water', 'lake', 'Lake'], ['tourism', 'viewpoint', 'Viewpoint'], ['historic', 'fort', 'Fort'],
  ['historic', 'castle', 'Palace / fort'], ['historic', 'ruins', 'Ruins'], ['historic', 'archaeological_site', 'Archaeological site'],
  ['historic', 'monument', 'Monument'], ['leisure', 'nature_reserve', 'Nature reserve'], ['boundary', 'national_park', 'National park'],
  ['amenity', 'place_of_worship', 'Temple / shrine'], ['tourism', 'museum', 'Museum'], ['tourism', 'attraction', 'Attraction'],
];

// public Overpass mirrors — shared cloud IPs often get rate-limited on one, so fall through to the next
const MIRRORS = (process.env.OVERPASS_URL ? [process.env.OVERPASS_URL] : []).concat(OVERPASS_MIRRORS);

async function overpass(q: string): Promise<{ elements?: OsmEl[] }> {
  const errs: string[] = [];
  for (const url of MIRRORS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'BeyondExplored/1.0 (nearby spots cache)' },
        body: `data=${encodeURIComponent(q)}`,
        cache: 'no-store',
        signal: AbortSignal.timeout(70_000),
      });
      const text = await res.text();
      if (!res.ok || text.trimStart().startsWith('<')) { errs.push(`${new URL(url).host} ${res.status === 200 ? 'busy' : res.status}`); continue; }
      const j = JSON.parse(text);
      if (j.remark && /error/i.test(j.remark)) { errs.push(`${new URL(url).host} timeout`); continue; }
      return j;
    } catch (e) {
      errs.push(`${new URL(url).host} ${(e as Error).message}`);
    }
  }
  throw new Error(`Overpass unavailable (${errs.join('; ')})`);
}

async function osmSpots(d: Destination, r: ReturnType<typeof rules>): Promise<Spot[]> {
  const q = osmQuery(d, r.radiusKm);
  const j = await overpass(q);
  return rankOsm(d, (j.elements ?? []) as OsmEl[], r.radiusKm);
}

/** Pure ranking of raw Overpass elements (also used to build the bundled seed). */
export function rankOsm(d: Pick<Destination, 'name' | 'state' | 'lat' | 'lng'>, els: OsmEl[], radiusKm: number): Spot[] {
  const r = { radiusKm };
  const byName = new Map<string, Spot & { score: number }>();
  for (const el of els) {
    const t = el.tags ?? {};
    const name = t['name:en'] || t.name;
    const lat = el.lat ?? el.center?.lat, lng = el.lon ?? el.center?.lon;
    if (!name || lat == null || lng == null || NOT_A_SPOT.test(name)) continue;
    if (!/[a-z]/i.test(name)) continue; // skip names with no Latin script (can't show nicely)
    const kind = OSM_KIND.find(([k, v]) => t[k] === v)?.[2] ?? 'Attraction';
    const dist = km(d, { lat, lng });
    if (dist > r.radiusKm * 1.2) continue; // big parks whose centre is far away
    if (dist < 0.5 && name.toLowerCase().includes(d.name.toLowerCase())) continue;
    if (/filthy|dirty|garbage|closed|abandoned toilet/i.test(name)) continue;
    // notability: things with a Wikipedia/Wikidata entry are the ones people actually go to
    const score = (t.wikipedia ? 3 : 0) + (t.wikidata ? 2 : 0) + (t.tourism ? 1 : 0)
      + (['Waterfall', 'Lake', 'Viewpoint', 'Hot spring', 'Glacier', 'Fort', 'Ruins'].includes(kind) ? 1 : 0)
      + (t.ele && kind === 'Peak' ? 0.5 : 0) - dist / 40;
    if (kind === 'Peak' && !t.wikidata) continue; // unnamed ridgelines clutter the list
    const key = name.toLowerCase();
    const prev = byName.get(key);
    if (prev && prev.score >= score) continue;
    byName.set(key, {
      id: `${el.type}/${el.id}`, name, lat, lng, kind, distKm: Math.round(dist * 10) / 10, src: 'osm', score,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(5)},${lng.toFixed(5)}`,
    });
  }
  return [...byName.values()]
    .filter((s) => s.score > 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, KEEP)
    .map(({ score: _s, ...s }) => s);
}

/* ---------------- refresh (single-flight, polite) ---------------- */

export type SpotRefresh = { provider: string; requested: number; fetched: number; remaining: number; error?: string };
let running: Promise<SpotRefresh> | null = null;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function due(now = Date.now(), force: string[] = []) {
  const db = readDb();
  const prov = spotProvider();
  return db.destinations
    .filter((d) => d.published !== false)
    .filter((d) => {
      if (force.includes(d.slug)) return true;
      const s = db.spots?.[d.slug];
      if (!s) return true;
      if (s.src !== prov && prov !== 'off') return true; // provider changed (e.g. key added) → upgrade
      return now - new Date(s.at).getTime() > (s.error ? 2 * 3600 * 1000 : STALE_MS);
    })
    .sort((a, b) => Number(!!db.spots?.[a.slug]) - Number(!!db.spots?.[b.slug]));
}

export function spotsDueCount() { return spotProvider() === 'off' ? 0 : due().length; }

export function refreshSpots(opts: { budgetMs?: number; only?: string[] } = {}): Promise<SpotRefresh> {
  if (running) return running;
  running = doRefresh(opts.budgetMs ?? 55_000, opts.only ?? []).finally(() => { running = null; });
  return running;
}

async function doRefresh(budgetMs: number, only: string[]): Promise<SpotRefresh> {
  const prov = spotProvider();
  const start = Date.now();
  const todo = only.length ? due(Date.now(), only).filter((d) => only.includes(d.slug)) : due();
  if (prov === 'off' || !todo.length) return { provider: prov, requested: todo.length, fetched: 0, remaining: todo.length };
  const r = rules(readDb().settings);
  let fetched = 0, error: string | undefined;
  for (const d of todo) {
    if (Date.now() - start > budgetMs) break;
    try {
      const spots = prov === 'google' ? await googleSpots(d, r) : await osmSpots(d, r);
      const set: SpotSet = { at: new Date().toISOString(), src: prov, spots };
      updateDb((db) => { (db.spots ??= {})[d.slug] = set; });
      fetched++;
    } catch (e) {
      error = (e as Error).message;
      const status = (e as { status?: number }).status;
      if (status === 401 || status === 403) break; // bad Google key: stop
      if (/Overpass unavailable/.test(error)) await sleep(20_000); // all mirrors busy: back off
      updateDb((db) => {
        const prev = db.spots?.[d.slug];
        (db.spots ??= {})[d.slug] = { at: new Date().toISOString(), src: prov, spots: prev?.spots ?? [], error };
      });
    }
    await sleep(prov === 'osm' ? 2500 : 300);
  }
  const remaining = due().length;
  updateDb((db) => { db.spotMeta = { lastRun: new Date().toISOString(), lastError: error, provider: prov, fetched }; });
  return { provider: prov, requested: todo.length, fetched, remaining, error };
}

export function refreshSpotsInBackground(only?: string[]) {
  refreshSpots({ budgetMs: 10 * 60_000, only }).catch(() => {});
}
