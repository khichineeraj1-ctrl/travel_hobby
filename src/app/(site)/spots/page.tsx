import Link from 'next/link';
import { GuideEnd } from '@/components/GuideEnd';
import { guide, guideQuiet } from '@/lib/guide';
import { PageHead } from '@/components/Listing';
import { PlaceGrid } from '@/components/PlaceCard';
import { getByMonth } from '@/lib/repo';
import { SpotAttribution, SpotCard } from '@/components/SpotList';
import { readDb } from '@/lib/db';
import { spotsFor } from '@/lib/places';
import { currentMonth, monthLabel } from '@/lib/months';
import { meta } from '@/lib/seo';
import type { Spot } from '@/lib/types';

export const metadata = meta({
  title: 'Hidden Waterfalls, Viewpoints & Treks in India',
  description: 'Top-rated viewpoints, waterfalls, lakes, treks and heritage spots around India’s least-crowded destinations, ranked by real traveller ratings, with distance from town and a map link.',
  path: '/spots',
});

const FILTERS = [
  { id: 'all', label: 'Everything', test: () => true },
  { id: 'gems', label: '💎 Hidden gems', test: (s: Spot) => !!s.gem },
  { id: 'water', label: '💧 Water', test: (s: Spot) => /water|lake|river|beach|spring|dam/i.test(`${s.kind} ${s.name}`) },
  { id: 'views', label: '🔭 Views & peaks', test: (s: Spot) => /view|peak|point|top|pass|glacier|observ/i.test(`${s.kind} ${s.name}`) },
  { id: 'wild', label: '🌳 Nature & treks', test: (s: Spot) => /park|reserve|forest|sanctuary|hik|trek|trail|cave|garden/i.test(`${s.kind} ${s.name}`) },
  { id: 'heritage', label: '🏛️ Heritage', test: (s: Spot) => /fort|palace|ruin|archae|monument|museum|temple|monaster|gompa|church|mosque|historic|shrine/i.test(`${s.kind} ${s.name}`) },
];

export default async function Spots({ searchParams }: { searchParams: Promise<{ type?: string; season?: string }> }) {
  const { type = 'all', season } = await searchParams;
  const f = FILTERS.find((x) => x.id === type) ?? FILTERS[0];
  const m = currentMonth();
  const places = readDb().destinations.filter((d) => d.published !== false && (season !== 'now' || d.bestMonths.includes(m) || d.okMonths.includes(m)));
  const q = (s: Spot) => (s.rating ? ((s.reviews ?? 0) * s.rating + 150 * 4) / ((s.reviews ?? 0) + 150) : 0);
  // round-robin across places so one town doesn't flood the list
  const perPlace = places.map((d) => ({ d, spots: spotsFor(d.slug).filter(f.test) })).filter((x) => x.spots.length);
  const all: { s: Spot; d: (typeof places)[number] }[] = [];
  for (let i = 0; i < 12; i++) {
    const round = perPlace.flatMap(({ d, spots }) => (spots[i] ? [{ s: spots[i], d }] : []));
    all.push(...round.sort((a, b) => q(b.s) - q(a.s)));
  }
  const href = (t: string, sn = season) => `/spots?${new URLSearchParams({ ...(t !== 'all' ? { type: t } : {}), ...(sn ? { season: sn } : {}) })}`;

  return (
    <div className="wrap" {...guide('Found a spot you love? Open its place page — we’ll plan the trip around it.', { label: 'Free itinerary', href: '/plan-my-trip' })}>
      <GuideEnd text="Pick a spot you liked — we’ll build the whole trip around it, free." label="Plan around it" href="/plan-my-trip" />
      <PageHead crumbs={[{ name: 'Top spots', path: '/spots' }]} kicker="More choices" h1="Top spots." intro="The best-rated waterfalls, viewpoints, lakes, treks and ruins around every place on here. Pick a base, then pick your detours." />
      <div className="mt-8 flex flex-wrap gap-2">
        {FILTERS.map((x) => (
          <Link key={x.id} href={href(x.id)} className={`chip ${x.id === f.id ? 'chip-on' : ''}`}>{x.label}</Link>
        ))}
        <Link href={href(f.id, season === 'now' ? undefined : 'now')} className={`chip ${season === 'now' ? 'chip-on' : ''}`}>📅 Good in {monthLabel(m)}</Link>
      </div>
      {all.length ? (
        <>
          <p className="mt-6 text-sm text-mute">{all.length} spots around {perPlace.length} places</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {all.map(({ s, d }) => <SpotCard key={`${d.slug}-${s.id}`} s={s} place={{ name: d.name, href: `/places/${d.slug}` }} />)}
          </div>
          <SpotAttribution spots={all.map((x) => x.s)} />
        </>
      ) : (
        <div className="mt-10">
          <p className="text-lg text-mute">{type !== 'all' || season ? 'No spots match that filter yet.' : 'We’re still mapping the spots around each place.'} Meanwhile, these places are at their best in {monthLabel(m)}:</p>
          <div className="mt-6"><PlaceGrid items={getByMonth(m).slice(0, 6)} /></div>
          {(type !== 'all' || season) && <Link href="/spots" className="link-arrow mt-6 inline-block text-[17px]">Clear filters</Link>}
        </div>
      )}
    </div>
  );
}
