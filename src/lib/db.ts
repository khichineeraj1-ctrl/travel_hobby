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
  if (!db.departures) db.departures = structuredClone(seedDepartures);
  if (!db.stays) db.stays = structuredClone(seedStays);
  if (!db.bookings) db.bookings = [];
  if (!db.leads) db.leads = [];
  if (!db.roadTrips) db.roadTrips = structuredClone(seedRoadTrips);
  if (!db.events) db.events = structuredClone(seedEvents);
  if (!db.routeCache) db.routeCache = {};
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
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
  cache = null;
  return db;
}
