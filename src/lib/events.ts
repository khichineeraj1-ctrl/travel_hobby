/** Event helpers: timing, nearby-matching and the "event triggers" used across the site. */
import type { Db, Destination, Month, TravelEvent } from './types';
import { km } from './travel';
import { addDays, fmtDate, nights, toDate, todayIST } from './booking';

export type Phase = 'upcoming' | 'live' | 'past';

export const phase = (e: TravelEvent, today = todayIST()): Phase =>
  e.endDate < today ? 'past' : e.startDate > today ? 'upcoming' : 'live';

export const daysUntil = (e: TravelEvent, today = todayIST()) => Math.max(0, nights(today, e.startDate));
export const daysSince = (e: TravelEvent, today = todayIST()) => Math.max(0, nights(e.endDate, today));

export const fmtEventDates = (e: TravelEvent) =>
  e.startDate === e.endDate
    ? fmtDate(e.startDate, { day: 'numeric', month: 'short', year: 'numeric' })
    : `${fmtDate(e.startDate)} – ${fmtDate(e.endDate, { day: 'numeric', month: 'short', year: 'numeric' })}`;

export const countdown = (e: TravelEvent, today = todayIST()) => {
  const p = phase(e, today);
  if (p === 'live') return 'Happening now';
  if (p === 'past') {
    const d = daysSince(e, today);
    return d === 0 ? 'Ended today' : `Ended ${d} day${d > 1 ? 's' : ''} ago`;
  }
  const d = daysUntil(e, today);
  return d === 0 ? 'Starts today' : d === 1 ? 'Starts tomorrow' : d < 60 ? `In ${d} days` : `In ${Math.round(d / 30)} months`;
};

export const CATEGORY_LABEL = { festival: 'Festival', music: 'Music', culture: 'Culture', religious: 'Sacred', sports: 'Sports', nature: 'Nature' } as const;

export const liveEvents = (db: Db) => db.events.filter((e) => e.status === 'published');

/** upcoming or happening within `days` */
export const upcomingEvents = (db: Db, days = 365, today = todayIST()) => {
  const horizon = addDays(today, days);
  return liveEvents(db)
    .filter((e) => e.endDate >= today && e.startDate <= horizon)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
};

/** ended in the last `days` — powers "missed it?" nudges */
export const recentPastEvents = (db: Db, days = 45, today = todayIST()) => {
  const since = addDays(today, -days);
  return liveEvents(db)
    .filter((e) => e.endDate < today && e.endDate >= since)
    .sort((a, b) => b.endDate.localeCompare(a.endDate));
};

const NEAR_KM = 100;
export const isNear = (e: TravelEvent, d: Destination) => e.destSlug === d.slug || km(e, d) <= NEAR_KM;

/** events at or near a place that are not over yet */
export const eventsNear = (db: Db, d: Destination, today = todayIST()) =>
  upcomingEvents(db, 365, today).filter((e) => isNear(e, d));

/** first day of the next occurrence of `month` (this year if not yet over, else next year) */
function monthWindow(month: Month, today = todayIST()) {
  const t = toDate(today);
  let y = t.getUTCFullYear();
  if (month < t.getUTCMonth() + 1) y += 1;
  const start = `${y}-${String(month).padStart(2, '0')}-01`;
  const end = addDays(`${month === 12 ? y + 1 : y}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}-01`, -1);
  return { start, end };
}

/** events overlapping the next occurrence of a month — used by the planner */
export const eventsInMonth = (db: Db, month: Month, today = todayIST()) => {
  const w = monthWindow(month, today);
  return liveEvents(db).filter((e) => e.startDate <= w.end && e.endDate >= w.start && e.endDate >= today);
};

/** a Destination-shaped target so travel times work for events without their own place page */
export function travelTarget(db: Db, e: TravelEvent): Destination | null {
  const linked = e.destSlug ? db.destinations.find((d) => d.slug === e.destSlug) : undefined;
  const nearest = linked ?? [...db.destinations].sort((a, b) => km(e, a) - km(e, b))[0];
  if (!nearest) return null;
  if (!linked && km(e, nearest) > 250) {
    return { ...nearest, lat: e.lat, lng: e.lng, airport: null, railhead: null, roadFactor: e.roadFactor ?? 1.4 };
  }
  return { ...nearest, lat: e.lat, lng: e.lng, roadFactor: e.roadFactor ?? nearest.roadFactor };
}
