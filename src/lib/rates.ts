/**
 * Live stay prices from LiteAPI (https://liteapi.travel — Nuitee), not scraped.
 *
 * For every place we ask for real 1-night rates (1 room, 2 adults, INR, taxes incl.) for
 * hotels/homestays within 25 km, on two sample dates ~3 weeks out (a weekday and a Saturday),
 * keep each property's cheapest room, and store min / 25th pct / median / 75th pct.
 *
 * Budget per person per day on the site then becomes:
 *   low  = p25 room ÷ 2 + food & local transport (low)
 *   high = p75 room ÷ 2 + food & local transport (high)
 * The food/local figure is an admin setting and is labelled as an estimate on the site.
 *
 * Needs LITEAPI_KEY. A sandbox key (sand_…) is fetched and shown in admin only, never public.
 */
import { readDb, updateDb } from './db';
import type { Destination, SiteSettings, StayRates } from './types';

const BASE = process.env.LITEAPI_BASE ?? 'https://api.liteapi.travel/v3.0';
const STALE_MS = 7 * 24 * 3600 * 1000;
const RETRY_MS = 6 * 3600 * 1000;
const RADIUS_M = 25_000;
const MIN_HOTELS = 3;
export const ON_GROUND_DEFAULT = { onGroundLo: 600, onGroundHi: 1500 };

export const ratesEnabled = () => !!process.env.LITEAPI_KEY && process.env.RATES_PROVIDER !== 'off';
export const isSandbox = () => (process.env.LITEAPI_KEY ?? '').startsWith('sand_');
export const onGround = (s?: SiteSettings): [number, number] => {
  const r = { ...ON_GROUND_DEFAULT, ...(s?.rates ?? {}) };
  return [r.onGroundLo, Math.max(r.onGroundLo, r.onGroundHi)];
};

/** Rates usable on the public site (fresh-ish, real key, enough hotels). */
export function publicRates(slug: string): StayRates | undefined {
  const r = readDb().stayRates?.[slug];
  if (!r || r.sandbox || r.count < MIN_HOTELS) return undefined;
  if (Date.now() - new Date(r.at).getTime() > 30 * 24 * 3600 * 1000) return undefined; // too old to trust
  return r;
}

/** Destination with budgetPerDay replaced by the live-derived range, when we have one. */
export function withLiveBudget(d: Destination, settings?: SiteSettings): Destination {
  const r = publicRates(d.slug);
  if (!r) return d;
  const og = onGround(settings);
  const round = (n: number) => Math.round(n / 50) * 50;
  const lo = round(r.p25 / 2 + og[0]);
  const hi = Math.max(lo, round(r.p75 / 2 + og[1]));
  return { ...d, budgetPerDay: [lo, hi], live: { stay: r, onGround: og } };
}

/* ---------------- LiteAPI ---------------- */

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'X-API-Key': process.env.LITEAPI_KEY!, accept: 'application/json', 'content-type': 'application/json', ...(init.headers ?? {}) },
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw Object.assign(new Error(`LiteAPI ${res.status}: ${j?.error?.message ?? j?.message ?? res.statusText}`), { status: res.status });
  }
  return res.json() as Promise<T>;
}

type Amount = { amount?: number; currency?: string };
type RateRow = { hotelId: string; roomTypes?: { offerRetailRate?: Amount; rates?: { retailRate?: { total?: Amount[] } }[] }[] };
type HotelRow = { id: string; name?: string; stars?: number; rating?: number; latitude?: number; longitude?: number };

const iso = (d: Date) => d.toISOString().slice(0, 10);
function sampleDates(now = new Date()) {
  const base = new Date(now.getTime() + 21 * 24 * 3600 * 1000);
  const tue = new Date(base); tue.setUTCDate(base.getUTCDate() + ((2 - base.getUTCDay() + 7) % 7));
  const sat = new Date(base); sat.setUTCDate(base.getUTCDate() + ((6 - base.getUTCDay() + 7) % 7));
  return [tue, sat].map((d) => ({ checkin: iso(d), checkout: iso(new Date(d.getTime() + 24 * 3600 * 1000)) }));
}

function cheapest(row: RateRow): number | undefined {
  let best: number | undefined;
  for (const rt of row.roomTypes ?? []) {
    const cands = [rt.offerRetailRate, ...(rt.rates ?? []).map((r) => r.retailRate?.total?.[0])];
    for (const a of cands) {
      if (!a?.amount || (a.currency && a.currency !== 'INR')) continue;
      if (best === undefined || a.amount < best) best = a.amount;
    }
  }
  return best;
}

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const pct = (sorted: number[], p: number) => {
  if (!sorted.length) return 0;
  const i = (sorted.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo));
};

export async function fetchStayRates(d: Destination): Promise<StayRates> {
  const dates = sampleDates();
  const perHotel = new Map<string, number[]>();
  for (const { checkin, checkout } of dates) {
    const j = await api<{ data?: RateRow[] }>('/hotels/rates', {
      method: 'POST',
      body: JSON.stringify({
        checkin, checkout, currency: 'INR', guestNationality: 'IN', occupancies: [{ adults: 2 }],
        latitude: d.lat, longitude: d.lng, radius: RADIUS_M, limit: 80, timeout: 12,
      }),
    });
    for (const row of j.data ?? []) {
      const p = cheapest(row);
      if (p && p > 150 && p < 200_000) perHotel.set(row.hotelId, [...(perHotel.get(row.hotelId) ?? []), p]);
    }
  }
  // a property's price = average of its cheapest room across the sample dates
  const priced = [...perHotel.entries()].map(([id, ps]) => ({ id, price: Math.round(ps.reduce((a, b) => a + b, 0) / ps.length) }));

  let info = new Map<string, HotelRow>();
  if (priced.length) {
    const ids = priced.slice(0, 200).map((h) => h.id).join(',');
    const hj = await api<{ data?: HotelRow[] }>(`/data/hotels?hotelIds=${encodeURIComponent(ids)}&limit=200`).catch(() => ({ data: [] as HotelRow[] }));
    info = new Map((hj.data ?? []).map((h) => [h.id, h]));
  }
  const hotels = priced
    .map((h) => {
      const x = info.get(h.id);
      const distKm = x?.latitude != null && x?.longitude != null ? Math.round(km(d, { lat: x.latitude, lng: x.longitude }) * 10) / 10 : undefined;
      return { id: h.id, name: x?.name ?? 'Stay', stars: x?.stars || undefined, rating: x?.rating || undefined, price: h.price, distKm };
    })
    .filter((h) => h.distKm === undefined || h.distKm <= RADIUS_M / 1000 + 5)
    .sort((a, b) => a.price - b.price);

  const prices = hotels.map((h) => h.price);
  return {
    at: new Date().toISOString(), src: 'liteapi', sandbox: isSandbox() || undefined,
    dates: dates.map((x) => x.checkin).sort(), count: prices.length,
    min: prices[0] ?? 0, p25: pct(prices, 0.25), median: pct(prices, 0.5), p75: pct(prices, 0.75),
    hotels: hotels.slice(0, 40),
  };
}

/* ---------------- refresh ---------------- */

export type RatesRefresh = { enabled: boolean; requested: number; fetched: number; remaining: number; error?: string };
let running: Promise<RatesRefresh> | null = null;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function due(force: string[] = []) {
  const db = readDb();
  const now = Date.now();
  return db.destinations.filter((d) => d.published !== false).filter((d) => {
    if (force.includes(d.slug)) return true;
    const r = db.stayRates?.[d.slug];
    if (!r) return true;
    if (!!r.sandbox !== isSandbox()) return true; // key switched sandbox → production
    if (r.error) return now - new Date(db.rateMeta?.lastRun ?? 0).getTime() > RETRY_MS - 60_000;
    return now - new Date(r.at).getTime() > STALE_MS;
  });
}
export const ratesDueCount = () => (ratesEnabled() ? due().length : 0);

export function refreshRates(opts: { budgetMs?: number; only?: string[] } = {}): Promise<RatesRefresh> {
  if (running) return running;
  running = doRefresh(opts.budgetMs ?? 55_000, opts.only ?? []).finally(() => { running = null; });
  return running;
}

async function doRefresh(budgetMs: number, only: string[]): Promise<RatesRefresh> {
  if (!ratesEnabled()) return { enabled: false, requested: 0, fetched: 0, remaining: 0 };
  const start = Date.now();
  const todo = only.length ? due(only).filter((d) => only.includes(d.slug)) : due();
  let fetched = 0, error: string | undefined;
  for (const d of todo) {
    if (Date.now() - start > budgetMs) break;
    try {
      const r = await fetchStayRates(d);
      updateDb((db) => { (db.stayRates ??= {})[d.slug] = r; });
      fetched++;
    } catch (e) {
      error = (e as Error).message;
      const status = (e as { status?: number }).status;
      if (status === 401 || status === 403) break; // bad key
      updateDb((db) => {
        const prev = db.stayRates?.[d.slug];
        (db.stayRates ??= {})[d.slug] = prev
          ? { ...prev, error } // keep the last good numbers and their date
          : { at: new Date().toISOString(), src: 'liteapi', sandbox: isSandbox() || undefined, dates: [], count: 0, min: 0, p25: 0, median: 0, p75: 0, hotels: [], error };
      });
      if (status === 429) await sleep(30_000);
    }
    await sleep(1000);
  }
  updateDb((db) => { db.rateMeta = { lastRun: new Date().toISOString(), lastError: error, fetched }; });
  return { enabled: true, requested: todo.length, fetched, remaining: due().length, error };
}

export function refreshRatesInBackground(only?: string[]) {
  refreshRates({ budgetMs: 15 * 60_000, only }).catch(() => {});
}
