/**
 * Booking engine core: availability, pricing, ids, validation.
 * Pure functions over the Db — used by pages, server actions and the admin.
 */
import crypto from 'node:crypto';
import type { Booking, Db, Departure, Stay } from './types';

/* ---------- dates (all YYYY-MM-DD, compared as UTC) ---------- */

export const toDate = (s: string) => new Date(`${s}T00:00:00Z`);
export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const todayIST = () => iso(new Date(Date.now() + 5.5 * 3600 * 1000));
export const addDays = (s: string, n: number) => iso(new Date(toDate(s).getTime() + n * 86400000));
export const nights = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86400000);
export const isIsoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(toDate(s).getTime());

export const fmtDate = (s: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
  toDate(s).toLocaleDateString('en-IN', { timeZone: 'UTC', ...opts });
export const fmtRange = (a: string, b: string) =>
  `${fmtDate(a)} – ${fmtDate(b, { day: 'numeric', month: 'short', year: 'numeric' })}`;

/* ---------- availability ---------- */

const live = (b: Booking) => b.status !== 'cancelled';

export function seatsLeft(dep: Departure, bookings: Booking[], ignoreId?: string) {
  const taken = bookings
    .filter((b) => live(b) && b.kind === 'trip' && b.departureId === dep.id && b.id !== ignoreId)
    .reduce((n, b) => n + b.guests, 0);
  return Math.max(0, dep.seatsTotal - taken);
}

/** rooms free for every night in [checkIn, checkOut) */
export function roomsLeft(stay: Stay, checkIn: string, checkOut: string, bookings: Booking[], ignoreId?: string) {
  const n = nights(checkIn, checkOut);
  if (n <= 0) return 0;
  const relevant = bookings.filter((b) => live(b) && b.kind === 'stay' && b.stayId === stay.id && b.id !== ignoreId && b.checkIn && b.checkOut);
  let worst = stay.rooms;
  for (let i = 0; i < n; i++) {
    const night = addDays(checkIn, i);
    const used = relevant
      .filter((b) => b.checkIn! <= night && night < b.checkOut!)
      .reduce((s, b) => s + (b.rooms ?? 1), 0);
    worst = Math.min(worst, stay.rooms - used);
  }
  return Math.max(0, worst);
}

export const upcomingDepartures = (db: Db, destSlug?: string) =>
  db.departures
    .filter((d) => d.published && d.startDate > todayIST() && (!destSlug || d.destSlug === destSlug))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

export const staysFor = (db: Db, destSlug?: string) =>
  db.stays.filter((s) => s.published && (!destSlug || s.destSlug === destSlug));

/* ---------- ids ---------- */

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
export function bookingRef(existing: Set<string>) {
  for (;;) {
    const bytes = crypto.randomBytes(6);
    const id = 'BK-' + Array.from(bytes, (b) => ALPHA[b % ALPHA.length]).join('');
    if (!existing.has(id)) return id;
  }
}
export const secretKey = () => crypto.randomBytes(12).toString('hex');
export const leadId = () => 'LD-' + crypto.randomBytes(5).toString('hex').toUpperCase();

/* ---------- validation ---------- */

/** Accepts 10-digit Indian mobiles with optional +91/0 prefix, or any +<country> number of 8–15 digits. */
export function normalizePhone(raw: string): string | null {
  const s = raw.replace(/[\s\-().]/g, '');
  const m = s.match(/^(?:\+?91|0)?([6-9]\d{9})$/);
  if (m) return `+91${m[1]}`;
  if (/^\+\d{8,15}$/.test(s)) return s;
  return null;
}
export const validEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

/* ---------- basic abuse protection (per server process) ---------- */

const hits = new Map<string, number[]>();
export function rateLimited(key: string, max = 12, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > max;
}

export const STATUS_LABEL = { pending: 'Pending', confirmed: 'Confirmed', paid: 'Paid', cancelled: 'Cancelled' } as const;
export const KIND_LABEL = { trip: 'Group trip', stay: 'Stay', custom: 'Custom trip' } as const;
export const LEAD_LABEL = { enquiry: 'Trip enquiry', dropoff: 'Booking drop-off', newsletter: 'Newsletter', partner: 'Partner signup', event: 'Event alert' } as const;
