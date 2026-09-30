/**
 * The suggestion engine.
 *
 * Aggregators rank by "what can we sell you". We rank by "will this trip
 * actually work for you right now": time you have, when you're going, who
 * you're going with, what you can spend, and the vibe you're after —
 * with a bias toward places that aren't overrun.
 *
 * Score breakdown (0–100):
 *   time fit   30  → on-ground days vs ideal (18) + low transit share of the trip (12)
 *   season     25  → best month 25, ok month 14, skip month 0 (+ warning)
 *   crew       15  → destination's crewFit for solo / duo / squad / fam
 *   vibe       15  → overlap with selected vibes
 *   budget     10  → your per-day spend vs the place's range
 *   hidden gem  5  → fewer crowds, more points
 *   event      +6  → a published event at/near the place during the chosen month (capped at 100)
 */
import { getAllDestinations, getCities, cityBySlug, vibeById } from './repo';
import { estimateTravel, travelDays } from './travel';
import { hrs, inr, crewLabel } from './format';
import { monthLabel } from './months';
import type { Destination, PlanInput, Suggestion, TravelEvent } from './types';
import { readDb } from './db';
import { eventsInMonth, fmtEventDates, isNear } from './events';

export function scoreDestination(d: Destination, input: PlanInput, monthEvents: TravelEvent[] = []): Suggestion | null {
  const origin = cityBySlug(input.from);
  if (!origin) return null;

  // broke-but-bored mode: below ~₹1,800/day we don't assume anyone is flying
  const allowFlights = input.budget >= 1800;
  const travel = estimateTravel(origin, d, { allowFlights, cities: getCities() });
  const oneWay = travel.fastest.hours;
  const groundDays = input.days - 2 * travelDays(oneWay);
  const minGround = Math.max(1, d.minDays - 1);
  const idealGround = Math.max(1, d.idealDays - 1);

  // hard filters
  if (groundDays < Math.max(0.75, minGround * 0.7)) return null;
  if (input.maxCrowd && d.crowd > input.maxCrowd) return null;

  const reasons: string[] = [];
  const warnings: string[] = [];

  // time: 18 for enough days on the ground, 12 for not burning the trip in transit
  const transitShare = Math.min(1, (2 * travelDays(oneWay)) / input.days);
  const timeScore = 18 * Math.min(1, groundDays / idealGround) + 12 * (1 - transitShare);
  reasons.push(`${hrs(oneWay)} by ${travel.fastest.mode} from ${origin.name}`);
  if (groundDays < minGround) warnings.push(`tight — ideally ${d.idealDays} days, you’d get ~${groundDays} on the ground`);
  if (transitShare > 0.5) warnings.push('more time in transit than chilling. worth it? maybe.');

  // season
  let seasonScore = 0;
  if (d.bestMonths.includes(input.month)) {
    seasonScore = 25;
    reasons.push(`${monthLabel(input.month)} is peak season here`);
  } else if (d.okMonths.includes(input.month)) {
    seasonScore = 14;
  } else {
    const s = d.skip.find((x) => x.months.includes(input.month));
    warnings.push(`${monthLabel(input.month)}: ${s ? s.why : 'not ideal'}`);
  }

  // crew
  const fit = d.crewFit[input.crew];
  const crewScore = (fit / 5) * 15;
  if (fit >= 5) reasons.push(`built for ${crewLabel[input.crew]} trips`);
  if (input.crew === 'fam' && d.altitudeM > 3300) warnings.push(`${d.altitudeM.toLocaleString('en-IN')}m altitude — check with elders & kids first`);
  if (input.crew === 'solo' && fit <= 3) warnings.push('doable solo, but easier with a group (shared cabs, permits)');

  // vibe
  let vibeScore = 10;
  if (input.vibes.length) {
    const hits = input.vibes.filter((v) => d.vibes.includes(v));
    vibeScore = hits.length ? 15 * (0.5 + 0.5 * (hits.length / input.vibes.length)) : 0;
    if (hits.length) reasons.push(`hits: ${hits.map((h) => vibeById(h)?.label).join(', ')}`);
  }

  // budget — flights aren't free: spread an average return fare across the trip
  const FLIGHT_RETURN_INR = 9000;
  const flying = travel.fastest.mode === 'flight';
  const effBudget = flying ? input.budget - FLIGHT_RETURN_INR / input.days : input.budget;
  const [lo, hi] = d.budgetPerDay;
  let budgetScore: number;
  if (effBudget >= hi) budgetScore = 10;
  else if (effBudget >= lo) budgetScore = 6 + (4 * (effBudget - lo)) / (hi - lo);
  else {
    budgetScore = Math.max(0, 10 * (effBudget / lo) - 4);
    warnings.push(flying ? `flights (~${inr(FLIGHT_RETURN_INR)} return) stretch your budget` : `usually ${inr(lo)}+/day here`);
  }
  if (input.budget >= lo && lo <= 1000) reasons.push(`doable from ${inr(lo)}/day`);

  // hidden gem
  const gemScore = (5 - d.crowd) * 1.25;
  if (d.crowd <= 1) reasons.push('basically nobody here yet');

  // event trigger: something worth timing the trip around, in the month they picked
  const ev = monthEvents.find((e) => isNear(e, d));
  const eventScore = ev ? 6 : 0;
  if (ev) reasons.unshift(`🎉 ${ev.name} is on (${fmtEventDates(ev)})`);

  const score = Math.round(Math.min(100, timeScore + seasonScore + crewScore + vibeScore + budgetScore + gemScore + eventScore));

  return {
    destination: d,
    score,
    travel,
    hoursOnGround: Math.round(groundDays * 24),
    reasons: reasons.slice(0, 4),
    warnings,
  };
}

export function suggest(input: PlanInput, limit = 8): Suggestion[] {
  const monthEvents = eventsInMonth(readDb(), input.month);
  return getAllDestinations()
    .map((d) => scoreDestination(d, input, monthEvents))
    .filter((s): s is Suggestion => !!s)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Impromptu mode: weighted random pick from the top results. */
export function roll(input: PlanInput, seed = Math.random()): Suggestion | null {
  const pool = suggest(input, 5);
  if (!pool.length) return null;
  const weights = pool.map((s) => s.score ** 4); // favour strong matches, keep some surprise
  const total = weights.reduce((a, b) => a + b, 0);
  let r = seed * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[0];
}

/**
 * No exact matches? Never leave them empty-handed: relax one constraint at a time
 * (crowd filter, +days, vibes, budget) and return the first few that produce results.
 */
export function nearMisses(input: PlanInput): { label: string; input: PlanInput; results: Suggestion[] }[] {
  const tries: { label: string; input: PlanInput }[] = [];
  if (input.maxCrowd) tries.push({ label: 'if you’re OK with a few more people around', input: { ...input, maxCrowd: undefined } });
  tries.push({ label: `with ${input.days + 2} days instead of ${input.days}`, input: { ...input, days: input.days + 2 } });
  if (input.vibes.length) tries.push({ label: 'with any vibe', input: { ...input, vibes: [] } });
  tries.push({ label: `with ~${inr(Math.round(input.budget * 1.5 / 100) * 100)}/day`, input: { ...input, budget: Math.round(input.budget * 1.5 / 100) * 100 } });
  tries.push({ label: 'with everything relaxed a little', input: { ...input, maxCrowd: undefined, vibes: [], days: input.days + 2 } });
  const out: { label: string; input: PlanInput; results: Suggestion[] }[] = [];
  const seen = new Set<string>();
  for (const t of tries) {
    const r = suggest(t.input, 3).filter((x) => !seen.has(x.destination.slug));
    if (!r.length) continue;
    r.forEach((x) => seen.add(x.destination.slug));
    out.push({ ...t, results: r });
    if (out.length >= 2) break;
  }
  return out;
}
