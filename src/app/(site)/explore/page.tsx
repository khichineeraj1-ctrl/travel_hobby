import Link from 'next/link';
import { PageHead } from '@/components/Listing';
import { PlaceCard } from '@/components/PlaceCard';
import { GemCard } from '@/components/GemCard';
import { cardOf } from '@/lib/gemPages';
import { NoteCard } from '@/components/NoteBanner';
import { SpotCard } from '@/components/SpotList';
import { GuideEnd } from '@/components/GuideEnd';
import { AutoSubmit } from '@/components/AutoSubmit';
import { search, stats, TYPE_SHORT, type Filters, type ItemType } from '@/lib/catalog';
import { getDestination } from '@/lib/repo';
import { INDIA_STATES } from '@/lib/gems';
import { allMonths, currentMonth, monthLabel, monthShort } from '@/lib/months';
import { guide } from '@/lib/guide';
import { meta } from '@/lib/seo';
import type { Month } from '@/lib/types';

type SP = Record<string, string | undefined>;
const PAGE = 36;

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const filtered = Object.keys(sp).some((k) => k !== 'n' && sp[k]);
  const s = stats();
  return meta({
    title: 'Explore Offbeat Places in India',
    description: `Search ${s.guides + s.gems}+ offbeat places across ${s.states} states — filter by state, month, waterfalls, treks, forts or views. Full guides plus top-rated hidden gems.`,
    path: '/explore',
    noindex: filtered, // filtered combinations are for people, not for Google
  });
}

export default async function Explore({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const f: Filters = {
    q: sp.q?.slice(0, 120) || undefined,
    state: INDIA_STATES.some((s) => s.slug === sp.state) ? sp.state : undefined,
    type: (['water', 'views', 'wild', 'heritage', 'sacred'] as ItemType[]).includes(sp.type as ItemType) ? (sp.type as ItemType) : undefined,
    month: Number(sp.month) >= 1 && Number(sp.month) <= 12 ? (Number(sp.month) as Month) : undefined,
    show: sp.show === 'guides' || sp.show === 'gems' ? sp.show : 'all',
    sort: sp.sort === 'rating' || sp.sort === 'az' ? sp.sort : 'best',
  };
  const n = Math.min(600, Math.max(PAGE, Number(sp.n) || PAGE));
  const { items, parsed } = search(f);
  const s = stats();
  const now = currentMonth();
  const shown = items.slice(0, n);
  const link = (patch: Partial<Record<string, string | undefined>>) => {
    const p = new URLSearchParams();
    const merged: Record<string, string | undefined> = { q: f.q, state: f.state, type: f.type, month: f.month ? String(f.month) : undefined, show: f.show === 'all' ? undefined : f.show, sort: f.sort === 'best' ? undefined : f.sort, ...patch };
    Object.entries(merged).forEach(([k, v]) => v && p.set(k, v));
    const qs = p.toString();
    return qs ? `/explore?${qs}` : '/explore';
  };
  const understood = [
    ...(parsed?.states.length && !f.state ? parsed.states.map((x) => INDIA_STATES.find((st) => st.slug === x)?.name) : []),
    ...(parsed?.month && !f.month ? [monthLabel(parsed.month)] : []),
    ...(parsed?.type && !f.type ? [TYPE_SHORT[parsed.type]] : []),
  ].filter(Boolean);
  const active = !!(f.q || f.state || f.type || f.month || f.show !== 'all');

  return (
    <div className="wrap">
      <GuideEnd text="Still scrolling? Tell us your dates and who’s coming — we’ll shortlist three for you, free." label="Shortlist for me" href="/plan-my-trip" />
      <PageHead
        crumbs={[{ name: 'Explore', path: '/explore' }]}
        kicker={`${s.guides + s.gems} places · ${s.states} states & UTs`}
        h1="Explore."
        intro="Search like you’d text a friend — “waterfalls in Meghalaya in October”, “forts in Rajasthan”, “treks near Manali”."
      />

      {/* search + filters: plain GET form, works without JS */}
      <form action="/explore" method="get" className="card mt-8 space-y-4 p-4 sm:p-5" {...guide('Type it like you’d say it — place, state, month, or what you’re into.', { label: 'Plan it for me', href: '/plan-my-trip' })}>
        <div className="flex gap-2">
          <input name="q" defaultValue={f.q} placeholder="waterfalls in Meghalaya in October…" aria-label="Search places" className="field !rounded-full" />
          <button className="btn shrink-0">Search</button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="text-xs text-mute">State
            <select name="state" defaultValue={f.state ?? ''} className="field mt-1 !py-2 text-[15px]" data-autosubmit>
              <option value="">All of India</option>
              {INDIA_STATES.map((st) => <option key={st.slug} value={st.slug}>{st.name}</option>)}
            </select>
          </label>
          <label className="text-xs text-mute">Month
            <select name="month" defaultValue={f.month ?? ''} className="field mt-1 !py-2 text-[15px]" data-autosubmit>
              <option value="">Any time</option>
              {allMonths.map((m) => <option key={m} value={m}>{monthLabel(m)}{m === now ? ' (now)' : ''}</option>)}
            </select>
          </label>
          <label className="text-xs text-mute">Show
            <select name="show" defaultValue={f.show} className="field mt-1 !py-2 text-[15px]" data-autosubmit>
              <option value="all">Everything</option><option value="guides">Full guides only</option><option value="gems">Hidden gems only</option>
            </select>
          </label>
          <label className="text-xs text-mute">Sort
            <select name="sort" defaultValue={f.sort} className="field mt-1 !py-2 text-[15px]" data-autosubmit>
              <option value="best">Best match</option><option value="rating">Highest rated</option><option value="az">A–Z</option>
            </select>
          </label>
        </div>
        {f.type && <input type="hidden" name="type" value={f.type} />}
        <AutoSubmit />
      </form>

      <div className="no-scrollbar -mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-1">
        <Link href={link({ type: undefined })} className={`chip shrink-0 ${!f.type ? 'chip-on' : ''}`}>Everything</Link>
        {(['water', 'views', 'wild', 'heritage', 'sacred'] as ItemType[]).map((t) => (
          <Link key={t} href={link({ type: f.type === t ? undefined : t })} className={`chip shrink-0 ${f.type === t ? 'chip-on' : ''}`}>{TYPE_SHORT[t]}</Link>
        ))}
        <Link href={link({ month: f.month === now ? undefined : String(now) })} className={`chip shrink-0 ${f.month === now ? 'chip-on' : ''}`}>📅 Good in {monthShort(now)}</Link>
      </div>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[15px] text-mute">
          <b className="text-ink">{items.length}</b> {items.length === 1 ? 'place' : 'places'}
          {understood.length > 0 && <> · understood: {understood.join(' · ')}</>}
        </p>
        {active && <Link href="/explore" className="text-sm text-blue-link hover:underline">Clear all</Link>}
      </div>

      {items.length === 0 ? (
        <div className="card mt-6 p-8">
          <p className="text-xl font-semibold">Nothing matches that exact combo.</p>
          <p className="mt-1 text-mute">Try a different month or drop a filter — or let a human find it for you.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {f.month && <Link href={link({ month: undefined })} className="btn-secondary btn-sm">Any month</Link>}
            {(f.type || parsed?.type) && <Link href={link({ type: undefined, q: undefined })} className="btn-secondary btn-sm">Any type</Link>}
            <Link href="/book/custom" className="btn btn-sm">Ask a human</Link>
          </div>
        </div>
      ) : (
        <section className="mt-5" {...guide('Tap a full guide for travel times, weather and costs — or any gem for directions, season and nearby stays.', { label: 'Plan a trip', href: '/plan-my-trip' })}>
          <h2 className="sr-only">Results</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((it) => {
              if (it.kind === 'note') return <NoteCard key={it.id} slug={it.id.slice(5)} />;
              if (it.kind === 'guide') {
                const d = getDestination(it.id.slice(6));
                return d ? <PlaceCard key={it.id} d={d} /> : null;
              }
              const c = cardOf({ id: it.id.slice(4) });
              if (c) return <GemCard key={it.id} g={c} />;
              return <SpotCard key={it.id} s={{ id: it.id, name: it.name, kind: it.label, rating: it.rating, reviews: it.reviews, mapsUrl: it.href, gem: it.gem, area: it.area ?? it.stateName, lat: 0, lng: 0, distKm: 0, src: 'google' }} />;
            })}
          </div>
          {items.length > n && (
            <div className="mt-8 text-center">
              <Link href={link({ n: String(n + PAGE) })} scroll={false} className="btn-secondary">Show {Math.min(PAGE, items.length - n)} more</Link>
            </div>
          )}
          {shown.some((i) => i.kind === 'gem') && <p className="mt-4 text-xs text-faint">Hidden-gem ratings and places from Google Maps. Seasons for gems are the usual travel season for that state (waterfalls: after the monsoon) — check local conditions before you go.</p>}
        </section>
      )}
    </div>
  );
}
