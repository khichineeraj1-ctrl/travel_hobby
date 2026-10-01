import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHead } from '@/components/Listing';
import { PlaceGrid } from '@/components/PlaceCard';
import { SpotAttribution } from '@/components/SpotList';
import { SpotTile } from '@/components/SpotTile';
import { GuideEnd } from '@/components/GuideEnd';
import { LinkChips } from '@/components/LinkChips';
import { JsonLd } from '@/lib/jsonld';
import { INDIA_STATES, gemsFor, stateBySlug } from '@/lib/gems';
import { getByState } from '@/lib/repo';
import { SPOT_FILTERS } from '@/lib/spotFilters';
import { guide } from '@/lib/guide';
import { abs, meta } from '@/lib/seo';

type P = { params: Promise<{ state: string }>; searchParams: Promise<{ type?: string }> };

export async function generateMetadata({ params }: P) {
  const st = stateBySlug((await params).state);
  if (!st) return {};
  const n = gemsFor(st.slug).length;
  return meta({
    title: `Hidden Gems in ${st.name}: Offbeat Places to Visit`,
    description: `${n ? `${n} top-rated` : 'Top-rated'} but uncrowded places in ${st.name} — waterfalls, viewpoints, treks, forts and villages most travellers skip, ranked by real Google ratings.`,
    path: `/hidden-gems/${st.slug}`,
    noindex: n === 0, // don't index an empty page
  });
}

export default async function StateGems({ params, searchParams }: P) {
  const st = stateBySlug((await params).state);
  if (!st) notFound();
  const { type = 'all' } = await searchParams;
  const f = SPOT_FILTERS.find((x) => x.id === type) ?? SPOT_FILTERS[0];
  const all = gemsFor(st.slug);
  const gems = all.filter(f.test);
  const ours = getByState(st.slug);
  const href = (t: string) => (t === 'all' ? `/hidden-gems/${st.slug}` : `/hidden-gems/${st.slug}?type=${t}`);

  return (
    <div className="wrap">
      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'ItemList', name: `Hidden gems in ${st.name}`, url: abs(`/hidden-gems/${st.slug}`),
        itemListElement: all.map((g, i) => ({
          '@type': 'ListItem', position: i + 1,
          item: { '@type': 'TouristAttraction', name: g.name, geo: { '@type': 'GeoCoordinates', latitude: g.lat, longitude: g.lng }, hasMap: g.mapsUrl, address: { '@type': 'PostalAddress', addressRegion: st.name, addressCountry: 'IN' } },
        })),
      }} />
      <GuideEnd text={`That’s ${st.name}’s hidden side. Want us to turn a few of these into one trip?`} label="Plan it for me" href="/book/custom" />
      <PageHead
        crumbs={[{ name: 'Hidden gems', path: '/hidden-gems' }, { name: st.name, path: `/hidden-gems/${st.slug}` }]}
        kicker={`${st.name} · offbeat`}
        h1={`Hidden gems in ${st.name}.`}
        intro={`Rated 4.4★+ by people who went, but still nowhere near the crowds. Real places, straight from Google Maps.`}
      />

      {all.length === 0 ? (
        <p className="card mt-10 p-8 text-mute">We’re still mapping {st.name}. Meanwhile, <Link href="/hidden-gems" className="text-blue-link underline">see other states</Link>.</p>
      ) : (
        <section className="mt-8" {...guide(`Like one of these? We can plan ${st.name} around it — free itinerary on WhatsApp.`, { label: 'Free itinerary', href: '/plan-my-trip' })}>
          <div className="flex flex-wrap gap-2">
            {SPOT_FILTERS.map((x) => <Link key={x.id} href={href(x.id)} className={`chip ${x.id === f.id ? 'chip-on' : ''}`}>{x.label}</Link>)}
          </div>
          <p className="mt-5 text-sm text-mute">{gems.length} of {all.length} gems</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gems.map((g) => <SpotTile key={g.id} s={g} />)}
          </div>
          {!gems.length && <Link href={href('all')} className="link-arrow mt-4 inline-block">Show all</Link>}
          <SpotAttribution spots={all} />
        </section>
      )}

      {ours.length > 0 && (
        <section className="mt-16" {...guide(`These ${st.name} places have full guides — best months, travel time, costs.`, { label: 'Compare them', href: `/state/${st.slug}` })}>
          <h2 className="headline">Full guides in {st.name}. <span>Best time, costs, the honest ick.</span></h2>
          <div className="mt-6"><PlaceGrid items={ours} /></div>
        </section>
      )}

      <section className="mt-16">
        <h2 className="mb-5 text-2xl font-semibold tracking-headline">Other states</h2>
        <LinkChips items={INDIA_STATES.filter((s) => s.slug !== st.slug && gemsFor(s.slug).length).map((s) => ({ href: `/hidden-gems/${s.slug}`, label: s.name }))} />
      </section>
    </div>
  );
}
