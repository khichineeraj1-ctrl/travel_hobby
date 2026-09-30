/**
 * Real road distances & drive times from a routing API, cached in the DB.
 *
 * Provider (auto):
 *   - OpenRouteService if ORS_API_KEY is set (free key, 500 matrix calls/day)  → https://openrouteservice.org
 *   - otherwise the public OSRM demo server (fine for our low, batched volume) → https://project-osrm.org
 *   - ROUTING_PROVIDER=off disables it (falls back to the estimate model)
 *
 * Pages never call the API: they read the cache synchronously. The cache is filled in the
 * background on server start, once a day, and whenever an admin saves a place/city/event/road trip.
 */
import { readDb, updateDb } from './db';
import type { CachedRoute, Db } from './types';

type P = { lat: number; lng: number };
const keyOf = (p: P) => `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`;
export const pairKey = (a: P, b: P) => `${keyOf(a)}>${keyOf(b)}`;
const STALE_MS = 90 * 24 * 3600 * 1000; // roads don't change often
const NONE_RETRY_MS = 14 * 24 * 3600 * 1000;

export function cachedRoute(a: P, b: P): CachedRoute | undefined {
  const c = readDb().routeCache?.[pairKey(a, b)];
  return c && !c.none && c.km > 0 ? c : undefined;
}

/** Free-flow router minutes → realistic Indian drive hours (traffic, breaks, ghats). */
export function realisticHours(c: CachedRoute, terrain = 1) {
  const base = (c.min / 60) * 1.15; // routers assume empty roads at the speed limit
  const ghats = (Math.max(1, terrain) - 1) * (Math.min(c.km, 150) / 60); // slow last stretch in hills
  const h = base + ghats;
  return h + Math.floor(h / 4) * 0.4; // chai / fuel breaks
}

export function provider() {
  const p = (process.env.ROUTING_PROVIDER ?? '').toLowerCase();
  if (p === 'off') return 'off';
  if (p === 'ors' || (!p && process.env.ORS_API_KEY)) return process.env.ORS_API_KEY ? 'ors' : 'off';
  return 'osrm';
}

/** Every origin→destination pair the site shows a time for. */
export function neededPairs(db: Db): { from: P; to: P }[] {
  const out = new Map<string, { from: P; to: P }>();
  const add = (from: P, to: P) => {
    if (!from || !to || !Number.isFinite(from.lat) || !Number.isFinite(to.lat)) return;
    if (keyOf(from) === keyOf(to)) return;
    out.set(pairKey(from, to), { from, to });
  };
  const places = db.destinations.filter((d) => d.published !== false);
  for (const d of places) {
    for (const c of db.cities) add(c, d);
    if (d.airport) add(d.airport, d);
    if (d.railhead) add(d.railhead, d);
  }
  const airportCities = db.cities.filter((c) => c.hasAirport);
  for (const c of db.cities.filter((c) => !c.hasAirport)) {
    const near = [...airportCities].sort((a, b) => Math.hypot(a.lat - c.lat, a.lng - c.lng) - Math.hypot(b.lat - c.lat, b.lng - c.lng))[0];
    if (near) add(c, near);
  }
  for (const e of db.events.filter((e) => e.status === 'published')) {
    for (const c of db.cities) add(c, e);
    const d = e.destSlug ? db.destinations.find((x) => x.slug === e.destSlug) : undefined;
    if (d?.airport) add(d.airport, e);
    if (d?.railhead) add(d.railhead, e);
  }
  for (const t of db.roadTrips.filter((t) => t.published)) {
    t.stops.slice(1).forEach((s, i) => add(t.stops[i], s));
  }
  return [...out.values()];
}

export function missingPairs(db: Db, now = Date.now()) {
  return neededPairs(db).filter(({ from, to }) => {
    const c = db.routeCache?.[pairKey(from, to)];
    if (!c) return true;
    const age = now - new Date(c.at).getTime();
    return c.none ? age > NONE_RETRY_MS : age > STALE_MS;
  });
}

/* ---------------- providers: matrix of sources × destinations ---------------- */

type Matrix = { km: (number | null)[][]; min: (number | null)[][] };

async function osrmTable(sources: P[], dests: P[]): Promise<Matrix> {
  const base = (process.env.OSRM_URL ?? 'https://router.project-osrm.org').replace(/\/$/, '');
  const coords = [...sources, ...dests].map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(';');
  const src = sources.map((_, i) => i).join(';');
  const dst = dests.map((_, i) => i + sources.length).join(';');
  const res = await fetch(`${base}/table/v1/driving/${coords}?sources=${src}&destinations=${dst}&annotations=duration,distance`, {
    headers: { 'User-Agent': 'BeyondExplored/1.0 (travel-time cache)' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const j = await res.json();
  if (j.code !== 'Ok') throw new Error(`OSRM ${j.code}`);
  return {
    km: j.distances.map((r: (number | null)[]) => r.map((m) => (m == null ? null : m / 1000))),
    min: j.durations.map((r: (number | null)[]) => r.map((s) => (s == null ? null : s / 60))),
  };
}

async function orsMatrix(sources: P[], dests: P[]): Promise<Matrix> {
  const locations = [...sources, ...dests].map((p) => [p.lng, p.lat]);
  const res = await fetch('https://api.openrouteservice.org/v2/matrix/driving-car', {
    method: 'POST',
    headers: { Authorization: process.env.ORS_API_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      locations,
      sources: sources.map((_, i) => i),
      destinations: dests.map((_, i) => i + sources.length),
      metrics: ['distance', 'duration'],
      units: 'km',
    }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`ORS ${res.status}`);
  const j = await res.json();
  return {
    km: j.distances,
    min: j.durations.map((r: (number | null)[]) => r.map((s) => (s == null ? null : s / 60))),
  };
}

/* ---------------- refresh (batched, rate-limited, single-flight) ---------------- */

let running: Promise<RefreshResult> | null = null;
export type RefreshResult = { provider: string; requested: number; fetched: number; remaining: number; error?: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

export function refreshRoutes(opts: { budgetMs?: number } = {}): Promise<RefreshResult> {
  if (running) return running;
  running = doRefresh(opts.budgetMs ?? 55_000).finally(() => { running = null; });
  return running;
}

async function doRefresh(budgetMs: number): Promise<RefreshResult> {
  const prov = provider();
  const start = Date.now();
  const todo = missingPairs(readDb());
  if (prov === 'off' || !todo.length) return { provider: prov, requested: todo.length, fetched: 0, remaining: todo.length };

  // group by source, then batch sources × destinations (≤ 25 × 25 per call)
  const bySrc = new Map<string, { p: P; dests: Map<string, P> }>();
  for (const { from, to } of todo) {
    const s = bySrc.get(keyOf(from)) ?? { p: from, dests: new Map() };
    s.dests.set(keyOf(to), to);
    bySrc.set(keyOf(from), s);
  }
  const srcGroups = chunk([...bySrc.values()], 25);
  let fetched = 0;
  let error: string | undefined;

  outer: for (const group of srcGroups) {
    const allDests = new Map<string, P>();
    group.forEach((g) => g.dests.forEach((p, k) => allDests.set(k, p)));
    for (const dests of chunk([...allDests.values()], 25)) {
      if (Date.now() - start > budgetMs) break outer;
      const sources = group.map((g) => g.p);
      try {
        const m = prov === 'ors' ? await orsMatrix(sources, dests) : await osrmTable(sources, dests);
        const at = new Date().toISOString();
        updateDb((db) => {
          db.routeCache ??= {};
          group.forEach((g, i) => {
            dests.forEach((d, j) => {
              if (!g.dests.has(keyOf(d))) return; // only store pairs we asked for
              const km = m.km[i]?.[j], min = m.min[i]?.[j];
              db.routeCache![pairKey(g.p, d)] = km == null || min == null || km <= 0
                ? { km: 0, min: 0, at, src: prov, none: true }
                : { km: Math.round(km), min: Math.round(min), at, src: prov };
              fetched++;
            });
          });
        });
      } catch (e) {
        error = (e as Error).message;
        break outer;
      }
      await sleep(prov === 'osrm' ? 1200 : 1600); // be polite to free servers
    }
  }

  const remaining = missingPairs(readDb()).length;
  updateDb((db) => { db.routeMeta = { lastRun: new Date().toISOString(), lastError: error, provider: prov, fetched }; });
  return { provider: prov, requested: todo.length, fetched, remaining, error };
}

/** fire-and-forget, never throws */
export function refreshRoutesInBackground() {
  refreshRoutes({ budgetMs: 5 * 60_000 }).catch(() => {});
}
