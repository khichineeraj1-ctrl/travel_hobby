/**
 * One searchable catalogue of everything we can show: our full place guides + all-India hidden gems.
 * Used by /explore, the home search box (/api/search) and the "in season now" rails.
 */
import { getAllDestinations, getVibes } from './repo';
import { INDIA_STATES, allGems } from './gems';
import { family } from './places';
import { gemHref } from './gemPages';
import { allNotes } from './notes';
import { STATE_SEASON, WATERFALL_MONTHS } from '@/data/state-seasons';
import { MONTHS, currentMonth } from './months';
import type { Month } from './types';

export type ItemType = 'water' | 'views' | 'wild' | 'heritage' | 'sacred' | 'other';
export type Item = {
  id: string;
  kind: 'guide' | 'gem' | 'note';
  name: string;
  stateSlug: string;
  stateName: string;
  types: ItemType[];
  label: string; // "Waterfall", "Hill station guide"…
  area?: string;
  hook?: string;
  rating?: number;
  reviews?: number;
  href: string;
  external: boolean;
  months: Month[];
  monthsFrom: 'guide' | 'state' | 'waterfall' | 'note';
  gem?: boolean;
  budgetFrom?: number;
  crowd?: number;
};

export const TYPE_LABEL: Record<ItemType, string> = {
  water: '💧 Waterfalls, lakes & beaches', views: '🔭 Views & peaks', wild: '🌳 Nature & treks',
  heritage: '🏛️ Forts & heritage', sacred: '🛕 Temples & monasteries', other: '📍 Other',
};
export const TYPE_SHORT: Record<ItemType, string> = { water: '💧 Water', views: '🔭 Views', wild: '🌳 Nature & treks', heritage: '🏛️ Heritage', sacred: '🛕 Sacred', other: '📍 Other' };

const VIBE_TYPES: Record<string, ItemType[]> = {
  'water-therapy': ['water'], 'chaos-mode': ['wild'], 'touch-grass': ['wild'], 'lore-drop': ['heritage'],
  stargazing: ['views'], 'cold-weather-arc': ['views'], 'main-character': ['views'],
};

let memo: { at: number; items: Item[] } | null = null;

export function catalog(): Item[] {
  if (memo && Date.now() - memo.at < 60_000) return memo.items; // cheap: rebuilt at most once a minute
  const stateName = (slug: string) => INDIA_STATES.find((s) => s.slug === slug)?.name ?? slug;
  const guides: Item[] = getAllDestinations().map((d) => {
    const types = [...new Set(d.vibes.flatMap((v) => VIBE_TYPES[v] ?? []))];
    return {
      id: `guide:${d.slug}`, kind: 'guide', name: d.name, stateSlug: d.stateSlug, stateName: d.state,
      types: types.length ? types : ['other'], label: 'Full guide', hook: d.hook, href: `/places/${d.slug}`, external: false,
      months: [...d.bestMonths, ...d.okMonths], monthsFrom: 'guide', budgetFrom: d.budgetPerDay[0], crowd: d.crowd,
    };
  });
  const gems: Item[] = allGems().map((g) => {
    const t = family(g.kind, g.name) as ItemType;
    const isFall = /fall|waterfall|jharna|kund\b/i.test(`${g.kind} ${g.name}`);
    return {
      id: `gem:${g.id}`, kind: 'gem', name: g.name, stateSlug: g.stateSlug, stateName: stateName(g.stateSlug),
      types: [t], label: g.kind, area: g.area, rating: g.rating, reviews: g.reviews, href: gemHref(g.id) ?? g.mapsUrl, external: !gemHref(g.id),
      months: isFall ? WATERFALL_MONTHS : (STATE_SEASON[g.stateSlug] ?? []), monthsFrom: isFall ? 'waterfall' : 'state', gem: g.gem,
    };
  });
  const notes: Item[] = allNotes().map((n) => ({
    id: `note:${n.slug}`, kind: 'note', name: n.shortName, stateSlug: n.stateSlug, stateName: n.stateName,
    types: ['wild'], label: 'Field notes', hook: `${n.keywords} ${n.intro}`, href: `/notes/${n.slug}`, external: false,
    months: [], monthsFrom: 'note',
  }));
  memo = { at: Date.now(), items: [...notes, ...guides, ...gems] };
  return memo.items;
}

/* ---------------- natural-language-ish query parsing ---------------- */

const STATE_ALIASES: Record<string, string> = {
  kashmir: 'jammu-kashmir', 'j&k': 'jammu-kashmir', jk: 'jammu-kashmir', himachal: 'himachal-pradesh', hp: 'himachal-pradesh',
  andaman: 'andaman-nicobar', andamans: 'andaman-nicobar', 'north east': '', northeast: '', bengal: 'west-bengal', darjeeling: 'west-bengal',
  arunachal: 'arunachal-pradesh', mp: 'madhya-pradesh', tn: 'tamil-nadu', pondicherry: 'puducherry',
  pondy: 'puducherry', daman: 'dadra-nagar-haveli-daman-diu', diu: 'dadra-nagar-haveli-daman-diu', coorg: 'karnataka', spiti: 'himachal-pradesh', leh: 'ladakh',
};
const NORTH_EAST = ['arunachal-pradesh', 'assam', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'sikkim', 'tripura'];
const TYPE_WORDS: [RegExp, ItemType][] = [
  [/\b(water ?falls?|falls|lakes?|beach(es)?|rivers?|island|backwaters?|dam|kayak|swim)\b/i, 'water'],
  [/\b(views?|viewpoints?|peaks?|sunrise|sunset|hill ?tops?|mountains?|stargaz\w*)\b/i, 'views'],
  [/\b(treks?|trekking|hikes?|hiking|forests?|wildlife|jungle|camping|valley|caves?|nature|meadows?)\b/i, 'wild'],
  [/\b(forts?|palaces?|ruins?|heritage|histor\w*|museums?|step ?wells?|caves? temples?)\b/i, 'heritage'],
  [/\b(temples?|monaster\w*|gompa|church(es)?|mosques?|spiritual)\b/i, 'sacred'],
];
const STOP = /\b(in|at|near|for|the|a|an|to|of|and|with|best|top|places?|place|spots?|visit|go|trip|travel|india|indian|hidden|gems?|offbeat|somewhere|some|me|show|find|want|month|season|during|this|next|good|great|nice|time|around|nearby|things|do)\b/gi;

export type Parsed = { text: string; states: string[]; month?: Month; type?: ItemType; snow?: boolean };
const SNOW_STATES = ['himachal-pradesh', 'uttarakhand', 'jammu-kashmir', 'ladakh', 'sikkim', 'arunachal-pradesh'];

export function parseQuery(raw: string): Parsed {
  let q = ` ${raw.toLowerCase().replace(/[^\p{L}\p{N}&\s-]/gu, ' ')} `;
  const out: Parsed = { text: '', states: [] };
  for (const s of INDIA_STATES) {
    const re = new RegExp(`\\b${s.name.toLowerCase().replace('&', '(&|and)')}\\b`, 'i');
    if (re.test(q)) { out.states.push(s.slug); q = q.replace(re, ' '); }
  }
  for (const [alias, slug] of Object.entries(STATE_ALIASES)) {
    const re = new RegExp(`(^|\\s)${alias.replace('&', '\\&')}(?=\\s)`, 'i');
    if (re.test(q)) { out.states.push(...(slug ? [slug] : NORTH_EAST)); q = q.replace(re, ' '); }
  }
  MONTHS.forEach((m, i) => {
    const re = new RegExp(`\\b(${m}|${m.slice(0, 3)})\\b`, 'i');
    if (!out.month && re.test(q)) { out.month = (i + 1) as Month; q = q.replace(re, ' '); }
  });
  if (/\b(now|this month|right now)\b/i.test(q)) { out.month ??= currentMonth(); q = q.replace(/\b(now|this month|right now)\b/gi, ' '); }
  if (/\bmonsoon\b/i.test(q)) { out.month ??= 8; out.type ??= 'water'; q = q.replace(/\bmonsoon\b/gi, ' '); }
  if (/\bsnow(fall|y)?\b/i.test(q)) { out.snow = true; q = q.replace(/\bsnow(fall|y)?\b/gi, ' '); }
  if (/\bwinter\b/i.test(q)) { out.month ??= 12; q = q.replace(/\bwinter\b/gi, ' '); }
  if (/\bsummer\b/i.test(q)) { out.month ??= 5; q = q.replace(/\bsummer\b/gi, ' '); }
  for (const [re, t] of TYPE_WORDS) if (!out.type && re.test(q)) { out.type = t; q = q.replace(re, ' '); }
  out.text = q.replace(STOP, ' ').replace(/\s+/g, ' ').trim();
  out.states = [...new Set(out.states)];
  return out;
}


/* ---------------- fuzzy matching (typos) ---------------- */

const tokCache = new Map<string, string[]>();
function tokensOf(hay: string) {
  let t = tokCache.get(hay);
  if (!t) { t = [...new Set(hay.split(/[^a-z0-9]+/).filter((x) => x.length > 2))]; if (tokCache.size > 5000) tokCache.clear(); tokCache.set(hay, t); }
  return t;
}
/** Damerau-ish edit distance with an early exit above `max`. */
function within(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let pp = prev;
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      // swapped neighbours ("chpota" → chopta) count as one edit
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], pp[j - 2] + 1);
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return false;
    pp = prev;
    prev = cur;
  }
  return prev[b.length] <= max;
}
/** "corbet" → corbett, "meghalya" → meghalaya, "rishikes" → rishikesh. Also prefix typing: "dhik" → dhikala. */
function fuzzyHit(w: string, toks: string[]) {
  if (w.length < 4) return false;
  const max = w.length >= 7 ? 2 : 1;
  return toks.some((t) => (t.startsWith(w)) || (t[0] === w[0] && within(w, t, max)));
}

/** Popular towns we may not list yet → their state, so a search never dead-ends. */
const TOWNS: Record<string, string> = {
  ramnagar: 'uttarakhand', nainital: 'uttarakhand', rishikesh: 'uttarakhand', mussoorie: 'uttarakhand', haridwar: 'uttarakhand', dehradun: 'uttarakhand', auli: 'uttarakhand', almora: 'uttarakhand', kedarnath: 'uttarakhand', badrinath: 'uttarakhand', lansdowne: 'uttarakhand',
  manali: 'himachal-pradesh', shimla: 'himachal-pradesh', kasol: 'himachal-pradesh', dharamshala: 'himachal-pradesh', mcleodganj: 'himachal-pradesh', dalhousie: 'himachal-pradesh', kasauli: 'himachal-pradesh', bir: 'himachal-pradesh',
  srinagar: 'jammu-kashmir', gulmarg: 'jammu-kashmir', pahalgam: 'jammu-kashmir', sonamarg: 'jammu-kashmir', nubra: 'ladakh', pangong: 'ladakh',
  jaipur: 'rajasthan', udaipur: 'rajasthan', jaisalmer: 'rajasthan', jodhpur: 'rajasthan', pushkar: 'rajasthan', bikaner: 'rajasthan', ranthambore: 'rajasthan', 'mount abu': 'rajasthan',
  agra: 'uttar-pradesh', varanasi: 'uttar-pradesh', lucknow: 'uttar-pradesh',
  darjeeling: 'west-bengal', kalimpong: 'west-bengal', sundarbans: 'west-bengal', gangtok: 'sikkim', pelling: 'sikkim', shillong: 'meghalaya', cherrapunji: 'meghalaya', sohra: 'meghalaya', tawang: 'arunachal-pradesh', ziro: 'arunachal-pradesh', kaziranga: 'assam', majuli: 'assam',
  goa: 'goa', panaji: 'goa', gokarna: 'karnataka', hampi: 'karnataka', chikmagalur: 'karnataka', mysore: 'karnataka', mysuru: 'karnataka', kabini: 'karnataka',
  munnar: 'kerala', alleppey: 'kerala', alappuzha: 'kerala', wayanad: 'kerala', varkala: 'kerala', kochi: 'kerala', thekkady: 'kerala',
  ooty: 'tamil-nadu', kodaikanal: 'tamil-nadu', pondicherry: 'puducherry', rameswaram: 'tamil-nadu', madurai: 'tamil-nadu',
  lonavala: 'maharashtra', mahabaleshwar: 'maharashtra', alibaug: 'maharashtra', 'tadoba': 'maharashtra', khajuraho: 'madhya-pradesh', pachmarhi: 'madhya-pradesh', kanha: 'madhya-pradesh', bandhavgarh: 'madhya-pradesh', orchha: 'madhya-pradesh',
  kutch: 'gujarat', 'gir': 'gujarat', puri: 'odisha', konark: 'odisha', 'havelock': 'andaman-nicobar', 'araku': 'andhra-pradesh', 'gandikota': 'andhra-pradesh',
};

/* ---------------- filtering & ranking ---------------- */

export type Filters = { q?: string; state?: string; type?: ItemType; month?: Month; show?: 'all' | 'guides' | 'gems'; sort?: 'best' | 'rating' | 'az' };

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

export type Fallback = { town: string; stateSlug: string; stateName: string };

export function search(f: Filters): { items: Item[]; parsed?: Parsed; fallback?: Fallback } {
  const parsed = f.q ? parseQuery(f.q) : undefined;
  const states = f.state ? [f.state] : parsed?.states ?? [];
  const type = f.type ?? parsed?.type;
  const month = f.month ?? parsed?.month;
  const words = parsed?.text ? norm(parsed.text).split(' ').filter((w) => w.length > 1) : [];
  const vibeHits = words.length ? getVibes().filter((v) => words.some((w) => norm(v.label).includes(w) || v.id.includes(w))).map((v) => v.id) : [];

  const snowSlugs = parsed?.snow ? new Set(getAllDestinations().filter((d) => d.vibes.includes('cold-weather-arc')).map((d) => `guide:${d.slug}`)) : null;
  let items = catalog().filter((it) =>
    (!snowSlugs || (it.kind === 'guide' ? snowSlugs.has(it.id) : it.kind === 'gem' && SNOW_STATES.includes(it.stateSlug) && it.types.some((t) => t === 'views' || t === 'wild'))) &&
    (!states.length || states.includes(it.stateSlug)) &&
    (!type || it.types.includes(type)) &&
    (!month || it.kind === 'note' || it.months.includes(month)) &&
    (f.show === 'guides' ? it.kind !== 'gem' : f.show === 'gems' ? it.kind === 'gem' : true));

  const guideVibes = vibeHits.length ? new Map(getAllDestinations().map((d) => [`guide:${d.slug}`, d.vibes])) : null;
  const scoreCache = new Map<string, { s: number; n: number; exact: boolean }>();
  const score = (it: Item) => {
    if (!words.length) return { s: 1, n: 0, exact: true };
    const hit = scoreCache.get(it.id);
    if (hit) return hit;
    const hay = norm(`${it.name} ${it.area ?? ''} ${it.stateName} ${it.label} ${it.hook ?? ''}`);
    const name = norm(it.name);
    const toks = tokensOf(hay);
    let s = 0, n = 0, exact = true;
    for (const w of words) {
      const v = name.includes(w) ? 3 : hay.includes(w) ? 1 : fuzzyHit(w, toks) ? 0.8 : 0;
      if (v) { s += v; n++; if (v < 1) exact = false; }
    }
    if (it.kind === 'guide' && guideVibes?.get(it.id)?.some((v) => vibeHits.includes(v))) { s += 2; n = Math.max(n, 1); }
    const r = { s, n, exact };
    scoreCache.set(it.id, r);
    return r;
  };
  const textScore = (it: Item) => score(it).s;
  let fallback: Fallback | undefined;
  if (words.length) {
    const base = items;
    items = base.filter((it) => score(it).s > 0);
    // precision: when some results match more of the words, keep only those ("village vatika" ≠ every village)
    const best = Math.max(0, ...items.map((it) => score(it).n));
    if (best > 1) items = items.filter((it) => score(it).n === best);
    // exact hits beat typo-guesses: only fall back to fuzzy when nothing matches exactly
    if (items.some((it) => score(it).exact)) items = items.filter((it) => score(it).exact);
    // nothing at all? a well-known town we don't list yet → show its state instead of a dead end
    if (!items.length) {
      const town = words.map((w) => [w, TOWNS[w]] as const).find(([, st]) => st);
      if (town && !states.length) {
        const st = town[1]!;
        fallback = { town: town[0], stateSlug: st, stateName: INDIA_STATES.find((x) => x.slug === st)?.name ?? st };
        items = catalog().filter((it) => it.stateSlug === st && (!type || it.types.includes(type)) && (!month || it.kind === 'note' || it.months.includes(month)));
        scoreCache.clear();
        words.length = 0;
      }
    }
  }

  const quality = (it: Item) => (it.kind === 'note' ? (words.length ? 5 : 4.3) : it.kind === 'guide' ? 4.9 : ((it.reviews ?? 0) * (it.rating ?? 0) + 200 * 4.1) / ((it.reviews ?? 0) + 200));
  const sort = f.sort ?? 'best';
  items = [...items].sort((a, b) =>
    sort === 'az' ? a.name.localeCompare(b.name)
      : sort === 'rating' ? (b.rating ?? 5) - (a.rating ?? 5) || (b.reviews ?? 0) - (a.reviews ?? 0)
        : textScore(b) - textScore(a) || quality(b) - quality(a));
  // "best": don't let one state flood the top of the page
  if (sort === 'best' && !states.length) {
    const seen: Record<string, number> = {}, first: Item[] = [], later: Item[] = [];
    for (const it of items) ((seen[it.stateSlug] = (seen[it.stateSlug] ?? 0) + 1) <= 3 ? first : later).push(it);
    items = [...first, ...later];
  }
  return { items, parsed, fallback };
}

export function stats() {
  const all = catalog();
  return {
    guides: all.filter((i) => i.kind === 'guide').length,
    gems: all.filter((i) => i.kind === 'gem').length,
    states: new Set(all.map((i) => i.stateSlug)).size,
  };
}
