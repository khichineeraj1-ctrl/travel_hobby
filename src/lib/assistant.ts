/**
 * Voice/text travel assistant ("Ask Beyond"). Claude answers ONLY from our database via tools:
 * search_places (the same engine as the planner), get_place, find_events, road_trips, save_lead.
 * Server-only. Needs ANTHROPIC_API_KEY (ASSISTANT_MODEL optional, default claude-haiku-4-5 for speed/cost).
 */
import { readDb, updateDb } from './db';
import { getAllDestinations, getCities, getDestination, getVibes } from './repo';
import { suggest } from './engine';
import { estimateTravel } from './travel';
import { spotsFor } from './places';
import { eventsNear, fmtEventDates, liveEvents, phase } from './events';
import { leadId, normalizePhone, todayIST, validEmail } from './booking';
import { currentMonth, monthLabel, MONTHS } from './months';
import { planToQuery } from './plan';
import { hrs, inr } from './format';
import type { Crew, Destination, Lead, Month, PlanInput } from './types';

export const assistantEnabled = () => !!process.env.ANTHROPIC_API_KEY && process.env.ASSISTANT !== 'off';
const MODEL = () => process.env.ASSISTANT_MODEL || 'claude-haiku-4-5';
const DAILY_LIMIT = () => Number(process.env.ASSISTANT_DAILY_LIMIT || 400);

export type Card = { kind: 'place' | 'event' | 'roadtrip' | 'plan'; title: string; sub: string; href: string };
export type Turn = { role: 'user' | 'assistant'; content: string };
export type Reply = { text: string; cards: Card[]; leadSaved?: boolean };

/* ---------------- tools (read our DB) ---------------- */

const findPlace = (q: string): Destination | undefined => {
  const s = q.toLowerCase().trim();
  const all = getAllDestinations();
  return getDestination(s) ?? all.find((d) => d.name.toLowerCase() === s) ?? all.find((d) => s.includes(d.name.toLowerCase()) || d.name.toLowerCase().includes(s));
};
const monthOf = (m: unknown): Month | undefined => {
  const n = Number(m);
  if (n >= 1 && n <= 12) return n as Month;
  const i = MONTHS.findIndex((x) => typeof m === 'string' && m.toLowerCase().startsWith(x.slice(0, 3)));
  return i >= 0 ? ((i + 1) as Month) : undefined;
};

const placeCard = (d: Destination): Card => ({ kind: 'place', title: d.name, sub: `${d.state} · ${d.hook}`, href: `/places/${d.slug}` });

type ToolCtx = { cards: Map<string, Card>; leadSaved: boolean; source: string };

const TOOLS = [
  {
    name: 'search_places',
    description: 'Rank our offbeat destinations for a trip. Use for any "where should I go" question. All params optional.',
    input_schema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'origin city slug' },
        days: { type: 'integer', description: 'total trip days incl. travel, 1–21' },
        budget: { type: 'integer', description: 'per person per day INR' },
        crew: { type: 'string', enum: ['solo', 'duo', 'squad', 'fam'] },
        month: { type: 'integer', description: '1–12' },
        vibes: { type: 'array', items: { type: 'string' }, description: 'vibe ids' },
        quiet: { type: 'boolean', description: 'true = only very uncrowded places' },
      },
    },
  },
  {
    name: 'get_place',
    description: 'Full facts about one destination: best months, budget, travel time from a city, crowd, network, top nearby spots, events, honest cons.',
    input_schema: { type: 'object', properties: { place: { type: 'string', description: 'name or slug' }, from: { type: 'string', description: 'origin city slug (optional)' } }, required: ['place'] },
  },
  {
    name: 'find_events',
    description: 'Upcoming festivals/events in India from our calendar. Optional month (1–12) or state/place text.',
    input_schema: { type: 'object', properties: { month: { type: 'integer' }, where: { type: 'string' } } },
  },
  {
    name: 'road_trips',
    description: 'Our road-trip routes with days, km, difficulty and best months. Optional month filter.',
    input_schema: { type: 'object', properties: { month: { type: 'integer' } } },
  },
  {
    name: 'save_lead',
    description: 'Save the visitor’s request so our team can WhatsApp them a free itinerary. ONLY call after the visitor has explicitly given their own phone number or email AND agreed to be contacted.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' }, phone: { type: 'string' }, email: { type: 'string' },
        place: { type: 'string' }, when: { type: 'string' }, from: { type: 'string' }, groupSize: { type: 'string' }, notes: { type: 'string' },
      },
    },
  },
];

function runTool(name: string, input: Record<string, unknown>, ctx: ToolCtx): unknown {
  const cities = getCities();
  const citySlug = (c: unknown) => {
    const s = String(c ?? '').toLowerCase();
    return cities.find((x) => x.slug === s || x.name.toLowerCase() === s)?.slug;
  };

  if (name === 'search_places') {
    const plan: PlanInput = {
      from: citySlug(input.from) ?? 'delhi',
      days: Math.min(21, Math.max(1, Number(input.days) || 4)),
      budget: Math.min(50000, Math.max(300, Number(input.budget) || 2500)),
      crew: (['solo', 'duo', 'squad', 'fam'].includes(String(input.crew)) ? input.crew : 'squad') as Crew,
      month: monthOf(input.month) ?? currentMonth(),
      vibes: Array.isArray(input.vibes) ? (input.vibes as string[]).filter((v) => getVibes().some((x) => x.id === v)) : [],
      maxCrowd: input.quiet ? 2 : undefined,
    };
    const res = suggest(plan, 5);
    res.slice(0, 3).forEach((r) => ctx.cards.set(r.destination.slug, placeCard(r.destination)));
    ctx.cards.set('plan', { kind: 'plan', title: 'See all matches', sub: `${plan.days} days from ${cities.find((c) => c.slug === plan.from)?.name} · ${monthLabel(plan.month)}`, href: `/plan?${planToQuery(plan)}` });
    return {
      assumed: { ...plan, month: monthLabel(plan.month) },
      results: res.map((r) => ({
        name: r.destination.name, slug: r.destination.slug, state: r.destination.state, match: r.score,
        hook: r.destination.hook, travel: `${hrs(r.travel.fastest.hours)} by ${r.travel.fastest.mode}`,
        budgetPerDay: `${inr(r.destination.budgetPerDay[0])}–${inr(r.destination.budgetPerDay[1])}${r.destination.live ? ' (live stay prices)' : ' (estimate)'}`,
        reasons: r.reasons, warnings: r.warnings,
      })),
    };
  }

  if (name === 'get_place') {
    const d = findPlace(String(input.place ?? ''));
    if (!d) return { error: 'not in our list', ourPlaces: getAllDestinations().map((x) => x.name) };
    ctx.cards.set(d.slug, placeCard(d));
    const from = citySlug(input.from);
    const origin = from ? cities.find((c) => c.slug === from) : undefined;
    const t = origin ? estimateTravel(origin, d, { cities }) : undefined;
    const evs = eventsNear(readDb(), d).slice(0, 3);
    return {
      name: d.name, state: d.state, altitudeM: d.altitudeM, about: d.about,
      bestMonths: d.bestMonths.map((m) => monthLabel(m)), okMonths: d.okMonths.map((m) => monthLabel(m)),
      skip: d.skip.map((s) => ({ months: s.months.map((m) => monthLabel(m)), why: s.why })),
      budgetPerDay: `${inr(d.budgetPerDay[0])}–${inr(d.budgetPerDay[1])} per person${d.live ? '' : ' (estimate)'}`,
      stays: d.live ? `rooms for two from ${inr(d.live.stay.min)}/night, typical ${inr(d.live.stay.median)} (${d.live.stay.count} stays)` : d.stayTypes.join(', '),
      crowd: `${d.crowd}/5`, network: d.signal, days: `min ${d.minDays}, ideal ${d.idealDays}`,
      crewFit: d.crewFit, doThis: d.doThis, honestCons: d.theIck,
      nearestAirport: d.airport?.name ?? null, nearestRailhead: d.railhead?.name ?? null,
      travelFromCity: t ? `${hrs(t.fastest.hours)} via ${t.fastest.mode} — ${t.fastest.note}` : undefined,
      topSpots: spotsFor(d.slug).slice(0, 5).map((s) => `${s.name} (${s.kind}, ${s.distKm} km${s.rating ? `, ${s.rating}★` : ''})`),
      events: evs.map((e) => `${e.name} — ${fmtEventDates(e)}`),
    };
  }

  if (name === 'find_events') {
    const today = todayIST();
    const m = monthOf(input.month);
    const where = String(input.where ?? '').toLowerCase();
    const list = liveEvents(readDb())
      .filter((e) => phase(e, today) !== 'past')
      .filter((e) => !m || Number(e.startDate.slice(5, 7)) === m || Number(e.endDate.slice(5, 7)) === m)
      .filter((e) => !where || `${e.town} ${e.state} ${e.name}`.toLowerCase().includes(where))
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 6);
    list.slice(0, 3).forEach((e) => ctx.cards.set(`e:${e.slug}`, { kind: 'event', title: e.name, sub: `${fmtEventDates(e)} · ${e.town}, ${e.state}`, href: `/events/${e.slug}` }));
    return list.map((e) => ({ name: e.name, dates: fmtEventDates(e), confirmed: e.dateStatus === 'confirmed', where: `${e.town}, ${e.state}`, hook: e.hook, tips: e.tips.slice(0, 2) }));
  }

  if (name === 'road_trips') {
    const m = monthOf(input.month);
    const list = readDb().roadTrips.filter((t) => t.published && (!m || t.bestMonths.includes(m))).slice(0, 6);
    list.slice(0, 3).forEach((t) => ctx.cards.set(`r:${t.slug}`, { kind: 'roadtrip', title: t.title, sub: t.hook, href: `/road-trips/${t.slug}` }));
    return list.map((t) => ({ title: t.title, hook: t.hook, stops: t.stops.map((s) => s.name).join(' → '), difficulty: t.difficulty, vehicle: t.vehicle, bestMonths: t.bestMonths.map((x) => monthLabel(x)), permits: t.permits }));
  }

  if (name === 'save_lead') {
    const phone = input.phone ? normalizePhone(String(input.phone)) : null;
    const email = input.email && validEmail(String(input.email)) ? String(input.email).toLowerCase() : undefined;
    if (!phone && !email) return { error: 'need a valid Indian mobile number or email from the visitor' };
    if (ctx.leadSaved) return { ok: true, note: 'already saved' };
    const data: Record<string, string> = {};
    for (const k of ['place', 'when', 'from', 'groupSize']) if (input[k]) data[k] = String(input[k]).slice(0, 200);
    data.message = `[voice assistant] ${String(input.notes ?? '').slice(0, 800)}`;
    const now = new Date().toISOString();
    const lead: Lead = { id: leadId(), kind: 'enquiry', status: 'new', createdAt: now, updatedAt: now, name: input.name ? String(input.name).slice(0, 80) : undefined, phone: phone ?? undefined, email, data, source: ctx.source };
    updateDb((db) => { db.leads.unshift(lead); });
    ctx.leadSaved = true;
    return { ok: true };
  }
  return { error: 'unknown tool' };
}

/* ---------------- conversation ---------------- */

function system() {
  const db = readDb();
  const m = currentMonth();
  return `You are "Beyond", the voice travel buddy on Beyond Explored — an Indian site for offbeat, uncrowded places. Today is ${todayIST()} (${monthLabel(m)}).
Talk like a well-travelled friend texting a Gen-Z traveller: warm, casual, confident, never salesy. Your replies are READ ALOUD, so:
- 1–3 short sentences, max ~60 words. No lists, markdown, emojis, URLs or symbols like ₹ in speech — say "rupees". Numbers rounded.
- Suggest at most 2–3 places per answer, and say why in a few words each.
- Always end with ONE easy next step or question (e.g. how many days, which city they're leaving from, or "want me to have our team send a free plan on WhatsApp?").
Facts: ONLY use what the tools return. Never invent places, prices, dates or events. If we don't cover something, say so and suggest the closest thing we do cover.
Call search_places for "where should I go" questions (fill what you know, assume sensible defaults and mention them briefly). Call get_place for questions about a specific place.
Budgets are per person per day on the ground, excluding travel to get there.
Leads: only if the visitor wants a plan, ask for their WhatsApp number. Call save_lead only after they give it and agree; then confirm a human will reach out. Never ask for anything else sensitive.
Stay on travel in India. Politely decline unrelated requests.
Origin city slugs: ${getCities().map((c) => c.slug).join(', ')}.
Vibe ids: ${getVibes().map((v) => `${v.id} (${v.label})`).join(', ')}.
Our places: ${db.destinations.filter((d) => d.published !== false).map((d) => d.name).join(', ')}.`;
}

type Block = { type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };
type Msg = { role: 'user' | 'assistant'; content: string | unknown[] };

async function callClaude(messages: Msg[]) {
  const res = await fetch(process.env.ANTHROPIC_BASE ?? 'https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL(), max_tokens: 400, system: system(), tools: TOOLS, messages }),
    signal: AbortSignal.timeout(25_000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Claude ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as { content: Block[]; stop_reason: string };
}

export function overDailyLimit() {
  const day = todayIST();
  const u = readDb().assistantUsage;
  return u?.day === day && u.count >= DAILY_LIMIT();
}

export async function ask(history: Turn[], source = 'voice assistant'): Promise<Reply> {
  const day = todayIST();
  updateDb((db) => {
    const u = db.assistantUsage?.day === day ? db.assistantUsage : { day, count: 0 };
    db.assistantUsage = { day, count: u.count + 1 };
    const q = history[history.length - 1]?.content;
    if (q) db.assistantLog = [{ at: new Date().toISOString(), q: q.slice(0, 300) }, ...(db.assistantLog ?? [])].slice(0, 300);
  });

  const ctx: ToolCtx = { cards: new Map(), leadSaved: false, source };
  const messages: Msg[] = history.slice(-10).map((t) => ({ role: t.role, content: t.content }));
  for (let round = 0; round < 4; round++) {
    const r = await callClaude(messages);
    const tools = r.content.filter((b): b is Extract<Block, { type: 'tool_use' }> => b.type === 'tool_use');
    if (r.stop_reason !== 'tool_use' || !tools.length) {
      const text = r.content.filter((b): b is Extract<Block, { type: 'text' }> => b.type === 'text').map((b) => b.text).join(' ').trim();
      return { text: text || 'Hmm, I blanked on that one. Try asking another way?', cards: pickCards(ctx, text), leadSaved: ctx.leadSaved || undefined };
    }
    messages.push({ role: 'assistant', content: r.content });
    messages.push({
      role: 'user',
      content: tools.map((t) => {
        let out: unknown;
        try { out = runTool(t.name, t.input ?? {}, ctx); } catch (e) { out = { error: (e as Error).message }; }
        return { type: 'tool_result', tool_use_id: t.id, content: JSON.stringify(out).slice(0, 12_000) };
      }),
    });
  }
  return { text: 'That took me a while — try narrowing it down, like a month or a city you’re leaving from?', cards: pickCards(ctx, '') };
}

/** Show cards for what the answer actually mentions (fallback: whatever the tools surfaced). */
function pickCards(ctx: ToolCtx, text: string): Card[] {
  const all = [...ctx.cards.values()];
  const t = text.toLowerCase();
  const mentioned = all.filter((c) => c.kind !== 'plan' && t.includes(c.title.toLowerCase().split(/[ ,(]/)[0]));
  const list = (mentioned.length ? mentioned : all.filter((c) => c.kind !== 'plan')).slice(0, 3);
  const plan = ctx.cards.get('plan');
  return plan ? [...list, plan] : list;
}
