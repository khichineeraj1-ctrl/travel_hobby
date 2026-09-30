/**
 * Data access layer (server-only). Everything reads through here.
 * Backed by src/lib/db.ts (JSON file) — swap that for a real DB without touching pages.
 */
import { readDb } from './db';
import type { Crew, Destination, Month, VibeId } from './types';

const pub = () => readDb().destinations.filter((d) => d.published !== false);

export const getSettings = () => readDb().settings;
export const getAllDestinations = (opts: { includeDrafts?: boolean } = {}): Destination[] =>
  opts.includeDrafts ? readDb().destinations : pub();
export const getDestination = (slug: string, opts: { includeDrafts?: boolean } = {}) =>
  getAllDestinations(opts).find((d) => d.slug === slug);
export const getByVibe = (v: VibeId) => pub().filter((d) => d.vibes.includes(v));
export const getByMonth = (m: Month) => pub().filter((d) => d.bestMonths.includes(m));
export const getByCrew = (c: Crew) => pub().filter((d) => d.crewFit[c] >= 4).sort((a, b) => b.crewFit[c] - a.crewFit[c]);
export const getByState = (stateSlug: string) => pub().filter((d) => d.stateSlug === stateSlug);
export const getStates = () => {
  const map = new Map<string, string>();
  pub().forEach((d) => map.set(d.stateSlug, d.state));
  return [...map.entries()].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name));
};
export const getCities = () => readDb().cities;
export const cityBySlug = (slug: string) => readDb().cities.find((c) => c.slug === slug);
export const getVibes = () => readDb().vibes;
export const vibeById = (id: string) => readDb().vibes.find((v) => v.id === id);

/** Nearby = closest other destinations, used for internal linking (SEO) */
export const getNearby = (d: Destination, limit = 3) =>
  pub()
    .filter((x) => x.slug !== d.slug)
    .map((x) => ({ x, km: Math.hypot(x.lat - d.lat, (x.lng - d.lng) * Math.cos((d.lat * Math.PI) / 180)) * 111 }))
    .sort((a, b) => a.km - b.km)
    .slice(0, limit)
    .map((r) => r.x);

/** validators for parsePlan (keeps plan.ts importable from client components) */
export const planLookup = {
  hasCity: (slug: string) => !!cityBySlug(slug),
  hasVibe: (id: string) => !!vibeById(id),
};
