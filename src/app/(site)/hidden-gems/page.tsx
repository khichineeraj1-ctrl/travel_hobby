import Link from 'next/link';
import { PageHead } from '@/components/Listing';
import { SpotAttribution, SpotCard } from '@/components/SpotList';
import { GuideEnd } from '@/components/GuideEnd';
import { JsonLd } from '@/lib/jsonld';
import { INDIA_STATES, gemsFor } from '@/lib/gems';
import { SPOT_FILTERS } from '@/lib/spotFilters';
import { guide } from '@/lib/guide';
import { itemListLd, meta } from '@/lib/seo';
import type { Gem } from '@/lib/types';

export const metadata = meta({
  title: 'Hidden Gems in Every Indian State',
  description: 'Top-rated but still uncrowded waterfalls, valleys, treks, forts and villages in all 36 states and UTs of India — ranked by real Google ratings, with a map link for each.',
  path: '/hidden-gems',
});

export default async function HiddenGems({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type = 'all' } = await searchParams;
  const f = SPOT_FILTERS.find((x) => x.id === type) ?? SPOT_FILTERS[0];
  const states = INDIA_STATES.map((s) => ({ ...s, gems: gemsFor(s.slug) })).filter((s) => s.gems.length);
  // nationwide picks: the best few from each state, so no single state dominates
  const picks: Gem[] = [];
  for (let i = 0; i < 3; i++) for (const s of states) { const g = s.gems.filter(f.test)[i]; if (g) picks.push(g); }
  const total = states.reduce((n, s) => n + s.gems.length, 0);
  const href = (t: string) => (t === 'all' ? '/hidden-gems' : `/hidden-gems?type=${t}`);

  return (
    <div className="wrap">
      <JsonLd data={itemListLd('Hidden gems in every Indian state', states.map((s) => ({ name: `Hidden gems in ${s.name}`, path: `/hidden-gems/${s.slug}` })))} />
      <GuideEnd text="Found a gem you like? Tell us — we’ll build a trip around it, stays and transport included." label="Plan around it" href="/book/custom" />
      <PageHead crumbs={[{ name: 'Hidden gems', path: '/hidden-gems' }]} kicker="All of India" h1="Hidden gems. Every state." intro="Places locals rate highly but the crowds haven’t found yet — waterfalls, valleys, treks, forts and villages, straight from real Google ratings." />

      {states.length === 0 ? (
        <p className="card mt-10 p-8 text-mute">We’re mapping India right now — check back in a few minutes.</p>
      ) : (
        <>
          <section className="mt-10" {...guide('Pick a state — each one has its own list of gems most travellers skip.', { label: 'Surprise me', href: '/roll' })}>
            <h2 className="text-2xl font-semibold tracking-headline">Pick a state</h2>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {states.map((s) => (
                <Link key={s.slug} href={`/hidden-gems/${s.slug}`} className="card card-hover min-w-0 p-4">
                  <span className="block truncate font-semibold">{s.name}</span>
                  <span className="block truncate text-sm text-mute">{s.gems.length} gems · {s.gems[0]?.name}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-16" {...guide('These are the cream of each state. Tap one to open it in Maps.', { label: 'Plan a trip', href: '/plan-my-trip' })}>
            <h2 className="headline">Best of India. <span>{total} gems across {states.length} states & UTs.</span></h2>
            <div className="mt-6 flex flex-wrap gap-2">
              {SPOT_FILTERS.map((x) => <Link key={x.id} href={href(x.id)} className={`chip ${x.id === f.id ? 'chip-on' : ''}`}>{x.label}</Link>)}
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {picks.slice(0, 60).map((g) => <SpotCard key={g.id} s={g} />)}
            </div>
            <SpotAttribution spots={picks} />
          </section>
        </>
      )}
    </div>
  );
}
