/**
 * Tiny JSON-file database: data/db.json (+ data/uploads/ for photos).
 * - Reads are cached in memory and re-read when the file's mtime changes.
 * - Writes are atomic (write temp file → rename).
 * Good for a single-server / local setup. To scale, reimplement readDb/updateDb
 * against Postgres (e.g. Neon) — nothing else in the app touches the file.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Db } from './types';
import { seedDb } from '@/data/seed';
import { seedDepartures, seedStays } from '@/data/seed-booking';
import { seedRoadTrips } from '@/data/seed-roadtrips';
import { seedEvents } from '@/data/seed-events';

export const DATA_DIR = process.env.BHATKO_DATA_DIR ?? path.join(/* turbopackIgnore: true */ process.cwd(), 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

let cache: { mtimeMs: number; db: Db } | null = null;

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify(seedDb(), null, 2));
}

/** Older db.json files predate the booking engine — add the new collections without touching existing content. */
function migrate(db: Partial<Db>): Db {
  if (!db.departures) db.departures = [];
  if (!db.stays) db.stays = [];
  if (!db.bookings) db.bookings = [];
  if (!db.leads) db.leads = [];
  if (!db.roadTrips) db.roadTrips = structuredClone(seedRoadTrips);
  if (!db.events) db.events = structuredClone(seedEvents);
  if (!db.routeCache) db.routeCache = {};

  // one-time clean-ups of launch placeholders (only touch data nobody has booked or edited)
  const booked = new Set((db.bookings ?? []).flatMap((b) => [b.departureId, b.stayId]).filter(Boolean));
  const sameAsSeed = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  db.departures = db.departures.filter((d) => booked.has(d.id) || !seedDepartures.some((s) => s.id === d.id && sameAsSeed(s, d)));
  db.stays = db.stays.filter((st) => booked.has(st.id) || !seedStays.some((s) => s.id === st.id && sameAsSeed(s, st)));
  if (db.settings?.banner?.text === 'October is peak season for 14 hidden spots — and most of them are still empty.') {
    db.settings.banner.text = '{month} is peak season for {peakCount} hidden spots — and most of them are still empty.';
    if (db.settings.banner.linkHref === '/when/october') db.settings.banner.linkHref = '/when/{monthSlug}';
  }
  return db as Db;
}

export function readDb(): Db {
  ensure();
  const { mtimeMs } = fs.statSync(DB_FILE);
  if (cache && cache.mtimeMs === mtimeMs) return cache.db;
  const db = migrate(JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) as Partial<Db>);
  cache = { mtimeMs, db };
  return db;
}

export function updateDb(mutate: (db: Db) => void): Db {
  const db = structuredClone(readDb());
  mutate(db);
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db)); // compact: ~40% smaller and faster to write/parse than pretty JSON
  fs.renameSync(tmp, DB_FILE);
  cache = null;
  return db;
}
