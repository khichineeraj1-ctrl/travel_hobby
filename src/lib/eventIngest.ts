/**
 * Validates events arriving from outside (the ingest API, JSON import, or a scheduled research job)
 * and turns them into `suggested` events for an admin to review. Nothing auto-publishes.
 */
import type { Db, EventCategory, TravelEvent } from './types';

const CATS: EventCategory[] = ['festival', 'music', 'culture', 'religious', 'sports', 'nature'];
const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function normalizeIncoming(raw: Record<string, unknown>): { ok: true; event: TravelEvent } | { ok: false; error: string } {
  const name = str(raw.name, 120);
  const startDate = raw.startDate, endDate = raw.endDate ?? raw.startDate;
  const lat = Number(raw.lat), lng = Number(raw.lng);
  if (!name) return { ok: false, error: 'name is required' };
  if (!isDate(startDate) || !isDate(endDate) || endDate < startDate) return { ok: false, error: `${name}: startDate/endDate must be YYYY-MM-DD` };
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 6 || lat > 37 || lng < 68 || lng > 98) return { ok: false, error: `${name}: lat/lng must be inside India` };
  const category = CATS.includes(raw.category as EventCategory) ? (raw.category as EventCategory) : 'festival';
  return {
    ok: true,
    event: {
      slug: slugify(str(raw.slug, 80) || `${name}-${startDate.slice(0, 4)}`),
      name, category, startDate, endDate,
      dateStatus: raw.dateStatus === 'confirmed' ? 'confirmed' : 'expected',
      town: str(raw.town, 80) || name, state: str(raw.state, 60),
      lat, lng,
      destSlug: str(raw.destSlug, 120) || undefined,
      roadTripSlug: str(raw.roadTripSlug, 120) || undefined,
      hook: str(raw.hook, 160), about: str(raw.about, 1500),
      tips: Array.isArray(raw.tips) ? raw.tips.map((t) => str(t, 200)).filter(Boolean).slice(0, 8) : [],
      recurring: raw.recurring === 'one-off' ? 'one-off' : 'annual',
      nextEdition: str(raw.nextEdition, 120) || undefined,
      sourceUrl: /^https?:\/\//.test(str(raw.sourceUrl)) ? str(raw.sourceUrl) : undefined,
      ticketUrl: /^https?:\/\//.test(str(raw.ticketUrl)) ? str(raw.ticketUrl) : undefined,
      roadFactor: Number(raw.roadFactor) >= 1 && Number(raw.roadFactor) <= 3 ? Number(raw.roadFactor) : undefined,
      status: 'suggested',
      createdAt: new Date().toISOString(),
    },
  };
}

/**
 * Add incoming events; skips slugs that already exist. Mutates db.
 * With settings.autoPublishEvents (default on) events that have a source link and haven't ended go
 * live immediately; anything else (no source, already over) lands in Suggested for a human look.
 */
export function addSuggestions(db: Db, items: unknown[]) {
  const added: string[] = [], skipped: string[] = [], errors: string[] = [], published: string[] = [];
  const auto = db.settings.autoPublishEvents !== false;
  const today = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  for (const it of items.slice(0, 200)) {
    if (!it || typeof it !== 'object') { errors.push('item is not an object'); continue; }
    const r = normalizeIncoming(it as Record<string, unknown>);
    if (!r.ok) { errors.push(r.error); continue; }
    // link to a known place if the sender guessed a slug that doesn't exist
    if (r.event.destSlug && !db.destinations.some((d) => d.slug === r.event.destSlug)) r.event.destSlug = undefined;
    if (r.event.roadTripSlug && !db.roadTrips.some((t) => t.slug === r.event.roadTripSlug)) r.event.roadTripSlug = undefined;
    if (db.events.some((e) => e.slug === r.event.slug)) { skipped.push(r.event.slug); continue; }
    if (auto && r.event.sourceUrl && r.event.endDate >= today) { r.event.status = 'published'; published.push(r.event.slug); }
    db.events.push(r.event);
    added.push(r.event.slug);
  }
  return { added, skipped, errors, published };
}
