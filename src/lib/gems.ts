/**
 * All-India hidden gems: highly rated but not over-reviewed spots in every state & UT,
 * straight from Google Places (no AI, no guesses). Needs GOOGLE_MAPS_API_KEY.
 *
 * Per state we run a few themed Text Searches ("hidden waterfalls in Kerala"…), keep places that are
 * actually in that state, rated ≥ 4.4 with 40–8,000 reviews (real, but not mainstream), drop hotels/
 * food/shops, rank by a review-weighted rating and cap each type so temples can't fill the list.
 * Refreshed every 25 days (Google allows caching up to 30). ~4 calls × 36 states ≈ 145 calls/run.
 */
import { readDb, updateDb } from './db';
import { diversify, gPost, notWorthIt, type GPlace } from './places';
import type { Gem } from './types';
export type { Gem };

export const INDIA_STATES: { slug: string; name: string; match: RegExp }[] = [
  ['andhra-pradesh', 'Andhra Pradesh'], ['arunachal-pradesh', 'Arunachal Pradesh'], ['assam', 'Assam'], ['bihar', 'Bihar'],
  ['chhattisgarh', 'Chhattisgarh'], ['goa', 'Goa'], ['gujarat', 'Gujarat'], ['haryana', 'Haryana'],
  ['himachal-pradesh', 'Himachal Pradesh'], ['jharkhand', 'Jharkhand'], ['karnataka', 'Karnataka'], ['kerala', 'Kerala'],
  ['madhya-pradesh', 'Madhya Pradesh'], ['maharashtra', 'Maharashtra'], ['manipur', 'Manipur'], ['meghalaya', 'Meghalaya'],
  ['mizoram', 'Mizoram'], ['nagaland', 'Nagaland'], ['odisha', 'Odisha'], ['punjab', 'Punjab'], ['rajasthan', 'Rajasthan'],
  ['sikkim', 'Sikkim'], ['tamil-nadu', 'Tamil Nadu'], ['telangana', 'Telangana'], ['tripura', 'Tripura'],
  ['uttar-pradesh', 'Uttar Pradesh'], ['uttarakhand', 'Uttarakhand'], ['west-bengal', 'West Bengal'],
  ['andaman-nicobar', 'Andaman and Nicobar Islands'], ['chandigarh', 'Chandigarh'], ['dadra-nagar-haveli-daman-diu', 'Dadra and Nagar Haveli and Daman and Diu'],
  ['delhi', 'Delhi'], ['jammu-kashmir', 'Jammu & Kashmir'], ['ladakh', 'Ladakh'], ['lakshadweep', 'Lakshadweep'], ['puducherry', 'Puducherry'],
].map(([slug, name]) => ({
  slug, name,
  // Google writes "Jammu and Kashmir", "Andaman and Nicobar Islands", "Odisha", "Puducherry"…
  match: new RegExp(`\\b${name.replace('&', '(&|and)').replace(/ and /g, ' (and|&) ')}\\b`, 'i'),
}));
export const stateBySlug = (slug: string) => INDIA_STATES.find((s) => s.slug === slug);

const THEMES = [
  'hidden waterfalls and lakes in',
  'offbeat viewpoints, valleys and treks in',
  'lesser known forts, ruins and heritage sites in',
  'unexplored nature spots and villages to visit in',
];
const STALE_MS = 25 * 24 * 3600 * 1000;
const MAX_AGE_MS = 30 * 24 * 3600 * 1000;
const KEEP = 24;
const RULES = { minRating: 4.4, minReviews: 40, maxReviews: 8000 };

/** Gems for a state (hidden ones removed, expired data dropped). */
export function gemsFor(stateSlug: string): Gem[] {
  const db = readDb();
  const set = db.gems?.[stateSlug];
  if (!set || Date.now() - new Date(set.at).getTime() > MAX_AGE_MS) return [];
  const hidden = new Set(db.hiddenSpots ?? []);
  return set.gems.filter((g) => !hidden.has(g.id));
}
export const allGems = () => INDIA_STATES.flatMap((s) => gemsFor(s.slug));

async function fetchState(st: (typeof INDIA_STATES)[number]): Promise<Gem[]> {
  const found = new Map<string, GPlace>();
  for (const theme of THEMES) {
    const res = await gPost('places:searchText', { textQuery: `${theme} ${st.name}, India`, pageSize: 20, languageCode: 'en', regionCode: 'IN' });
    res.forEach((p) => found.set(p.id, p));
  }
  const gems: Gem[] = [];
  for (const p of found.values()) {
    if (notWorthIt(p)) continue;
    if (!st.match.test(p.formattedAddress ?? '')) continue; // must really be in this state
    const rating = p.rating ?? 0, reviews = p.userRatingCount ?? 0;
    if (rating < RULES.minRating || reviews < RULES.minReviews || reviews > RULES.maxReviews) continue;
    const name = p.displayName!.text;
    gems.push({
      id: p.id, name, lat: p.location!.latitude, lng: p.location!.longitude,
      kind: p.primaryTypeDisplayName?.text ?? 'Attraction', rating, reviews, distKm: 0,
      mapsUrl: p.googleMapsUri ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${p.id}`,
      gem: rating >= 4.5 && reviews < 1500, src: 'google',
      area: (p.shortFormattedAddress ?? '').split(',').slice(-2).join(',').trim() || st.name,
      stateSlug: st.slug,
    });
  }
  const q = (g: Gem) => ((g.reviews ?? 0) * (g.rating ?? 0) + 200 * 4.1) / ((g.reviews ?? 0) + 200);
  return diversify(gems.sort((a, b) => q(b) - q(a)), KEEP, 5);
}

/* ---------------- refresh ---------------- */

export const gemsEnabled = () => !!process.env.GOOGLE_MAPS_API_KEY && process.env.GEMS !== 'off';
function due(force: string[] = []) {
  const db = readDb();
  const now = Date.now();
  return INDIA_STATES.filter((s) => {
    if (force.includes(s.slug)) return true;
    const g = db.gems?.[s.slug];
    if (!g) return true;
    return now - new Date(g.at).getTime() > (g.error ? 6 * 3600 * 1000 : STALE_MS);
  });
}
export const gemsDueCount = () => (gemsEnabled() ? due().length : 0);

let running: Promise<{ fetched: number; remaining: number; error?: string }> | null = null;
export function refreshGems(opts: { budgetMs?: number; only?: string[] } = {}) {
  if (running) return running;
  running = (async () => {
    if (!gemsEnabled()) return { fetched: 0, remaining: 0, error: 'GOOGLE_MAPS_API_KEY not set' };
    const start = Date.now();
    const only = opts.only ?? [];
    const todo = only.length ? due(only).filter((s) => only.includes(s.slug)) : due();
    let fetched = 0, error: string | undefined;
    for (const st of todo) {
      if (Date.now() - start > (opts.budgetMs ?? 55_000)) break;
      try {
        const gems = await fetchState(st);
        updateDb((db) => { (db.gems ??= {})[st.slug] = { at: new Date().toISOString(), gems }; });
        fetched++;
      } catch (e) {
        error = (e as Error).message;
        const status = (e as { status?: number }).status;
        updateDb((db) => {
          const prev = db.gems?.[st.slug];
          (db.gems ??= {})[st.slug] = { at: prev?.at ?? new Date().toISOString(), gems: prev?.gems ?? [], error };
        });
        if (status === 401 || status === 403 || status === 429) break; // bad key / quota hit: stop for now
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    updateDb((db) => { db.gemsMeta = { lastRun: new Date().toISOString(), lastError: error, fetched }; });
    return { fetched, remaining: due().length, error };
  })().finally(() => { running = null; });
  return running;
}
export const refreshGemsInBackground = () => { refreshGems({ budgetMs: 15 * 60_000 }).catch(() => {}); };
