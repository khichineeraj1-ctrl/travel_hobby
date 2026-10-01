import Link from 'next/link';
import { GuideEnd } from '@/components/GuideEnd';
import { guide, guideQuiet } from '@/lib/guide';
import { PageHead } from '@/components/Listing';
import { PlaceGrid } from '@/components/PlaceCard';
import { getByMonth } from '@/lib/repo';
import { SpotAttribution } from '@/components/SpotList';
import { SpotTile } from '@/components/SpotTile';
import { readDb } from '@/lib/db';
import { spotsFor } from '@/lib/places';
import { currentMonth, monthLabel } from '@/lib/months';
import { meta } from '@/lib/seo';
import { SPOT_FILTERS } from '@/lib/spotFilters';
import type { Spot } from '@/lib/types';

export const metadata = meta({
  title: 'Hidden Waterfalls, Viewpoints & Treks in India',
  description: 'Top-rated viewpoints, waterfalls, lakes, treks and heritage spots around India’s least-crowded destinations, ranked by real traveller ratings, with distance from town and a map link.',
  path: '/spots',
});


export default async function Spots({ searchParams }: { searchParams: Promise<{ type?: string; season?: string; n?: string }> }) {
  const { type = 'all', season, n: nRaw } = await searchParams;
  const n = Math.min(400, Math.max(36, Number(nRaw) || 36));
  const f = SPOT_FILTERS.find((x) => x.id === type) ?? SPOT_FILTERS[0];
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
  const href = (t: string, sn = season, more?: number) => `/spots?${new URLSearchParams({ ...(t !== 'all' ? { type: t } : {}), ...(sn ? { season: sn } : {}), ...(more ? { n: String(more) } : {}) })}`;

  return (
    <div className="wrap" {...guide('Tap any spot — directions, best months and a trip plan are inside.', { label: 'Free itinerary', href: '/plan-my-trip' })}>
      <GuideEnd text="Pick a spot you liked — we’ll build the whole trip around it, free." label="Plan around it" href="/plan-my-trip" />
      <PageHead crumbs={[{ name: 'Top spots', path: '/spots' }]} kicker="More choices" h1="Top spots." intro="The best-rated waterfalls, viewpoints, lakes, treks and ruins around every place on here. Pick a base, then pick your detours." />
      <Link href="/hidden-gems" className="card card-hover mt-6 flex items-center justify-between gap-4 p-5">
        <span><b>Want more?</b> <span className="text-mute">Hidden gems in all 36 states & UTs — not just around our places.</span></span>
        <span className="text-blue-link">Explore ›</span>
      </Link>
      <div className="mt-8 flex flex-wrap gap-2">
        {SPOT_FILTERS.map((x) => (
          <Link key={x.id} href={href(x.id)} className={`chip ${x.id === f.id ? 'chip-on' : ''}`}>{x.label}</Link>
        ))}
        <Link href={href(f.id, season === 'now' ? undefined : 'now')} className={`chip ${season === 'now' ? 'chip-on' : ''}`}>📅 Good in {monthLabel(m)}</Link>
      </div>
      {all.length ? (
        <>
          <p className="mt-6 text-sm text-mute">{all.length} spots around {perPlace.length} places</p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {all.slice(0, n).map(({ s, d }) => <SpotTile key={`${d.slug}-${s.id}`} s={s} area={s.distKm < 1 ? `In ${d.name}` : `${s.distKm} km from ${d.name}`} />)}
          </div>
          {all.length > n && (
            <div className="mt-8 text-center">
              <Link href={href(f.id, season, n + 36)} scroll={false} className="btn-secondary">Show {Math.min(36, all.length - n)} more</Link>
            </div>
          )}
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
