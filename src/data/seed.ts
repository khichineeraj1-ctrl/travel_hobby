import type { Db } from '@/lib/types';
import { destinations } from './destinations';
import { cities } from './cities';
import { vibes } from './vibes';
import { defaultSettings } from './settings';
import { seedDepartures, seedStays } from './seed-booking';
import { seedRoadTrips } from './seed-roadtrips';
import { seedEvents } from './seed-events';

/** Initial content. Only used to create data/db.json the first time — after that the admin owns the data. */
export const seedDb = (): Db => ({
  settings: structuredClone(defaultSettings),
  vibes: structuredClone(vibes),
  cities: structuredClone(cities),
  destinations: structuredClone(destinations).map((d) => ({ ...d, published: true })),
  departures: [],
  stays: [],
  bookings: [],
  leads: [],
  roadTrips: structuredClone(seedRoadTrips),
  events: structuredClone(seedEvents),
});
