import { currentMonth } from './months';
import type { Crew, Month, PlanInput, VibeId } from './types';

type Lookup = { hasCity: (slug: string) => boolean; hasVibe: (id: string) => boolean };

const CREWS: Crew[] = ['solo', 'duo', 'squad', 'fam'];

type Params = Record<string, string | string[] | undefined> | URLSearchParams;
const get = (p: Params, k: string) => {
  if (p instanceof URLSearchParams) return p.get(k) ?? undefined;
  const v = p[k];
  return Array.isArray(v) ? v[0] : v;
};

/** Parse & sanitise planner input from query params. Never trust the URL. */
export function parsePlan(p: Params, lookup: Lookup = { hasCity: () => true, hasVibe: () => true }): PlanInput {
  const from = get(p, 'from');
  const days = Number(get(p, 'days'));
  const budget = Number(get(p, 'budget'));
  const crew = get(p, 'crew') as Crew;
  const month = Number(get(p, 'month'));
  const vibes = (get(p, 'vibes') ?? '')
    .split(',')
    .filter((v) => v && lookup.hasVibe(v)) as VibeId[];
  const maxCrowd = Number(get(p, 'maxCrowd'));

  return {
    from: from && lookup.hasCity(from) ? from : 'delhi',
    days: Number.isFinite(days) && days >= 1 && days <= 21 ? Math.round(days) : 3,
    budget: Number.isFinite(budget) && budget >= 300 ? Math.min(budget, 50000) : 2000,
    crew: CREWS.includes(crew) ? crew : 'squad',
    month: (month >= 1 && month <= 12 ? month : currentMonth()) as Month,
    vibes,
    maxCrowd: maxCrowd >= 1 && maxCrowd <= 5 ? maxCrowd : undefined,
  };
}

export function planToQuery(p: PlanInput) {
  const q = new URLSearchParams({
    from: p.from, days: String(p.days), budget: String(p.budget), crew: p.crew, month: String(p.month),
  });
  if (p.vibes.length) q.set('vibes', p.vibes.join(','));
  if (p.maxCrowd) q.set('maxCrowd', String(p.maxCrowd));
  return q.toString();
}
