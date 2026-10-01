import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { GemArt, GemCard, KIND_ICON } from '@/components/GemCard';
import { PlaceCard } from '@/components/PlaceCard';
import { GuideEnd } from '@/components/GuideEnd';
import { LeadForm } from '@/components/LeadForm';
import { JsonLd } from '@/lib/jsonld';
import { abs, meta } from '@/lib/seo';
import { guide, guideQuiet } from '@/lib/guide';
import { asCard, gemBySlug, nearbyGems, nearestCities, nearestGuide } from '@/lib/gemPages';
import { allMonths, currentMonth, monthLabel, monthShort } from '@/lib/months';

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const g = gemBySlug((await params).slug);
  if (!g) return {};
  const best = g.months.length && g.months.length < 12 ? ` Best ${g.months.slice(0, 3).map((m) => monthShort(m)).join('–')}.` : '';
  return meta({
    title: `${g.name}, ${g.stateName}`,
    description: `${g.name} — a ${g.kind.toLowerCase()} in ${g.area ? `${g.area}, ` : ''}${g.stateName}${g.rating ? `, rated ${g.rating.toFixed(1)}★ by ${g.reviews?.toLocaleString('en-IN')} visitors` : ''}.${best} How to get there, what’s nearby and a trip plan.`,
    path: `/gems/${g.slug}`,
    noindex: true, // thin, data-driven pages: useful for people, not yet for Google
  });
}

export default async function GemPage({ params }: P) {
  const g = gemBySlug((await params).slug);
  if (!g) notFound();

  const now = currentMonth();
  const inSeason = g.months.includes(now);
  const near = nearbyGems(g, 6);
  const base = nearestGuide(g);
  const { city, airport } = nearestCities(g);
  const road = (k: number) => Math.round(k * 1.3); // straight line → rough road distance
  const drive = (k: number) => { const h = road(k) / 40; return h < 1 ? `${Math.max(15, Math.round(h * 60 / 15) * 15)} min` : `${Math.round(h * 2) / 2} h`; };
  const seasonNote = g.monthsFrom === 'waterfall' ? 'Waterfalls run fullest in and just after the monsoon.' : `The usual travel season for ${g.stateName}.`;
  const planHref = `/book/custom?gem=${g.slug}`;
  const d = 0.06; // ~6 km box around the pin
  const osm = `https://www.openstreetmap.org/export/embed.html?bbox=${g.lng - d},${g.lat - d / 1.4},${g.lng + d},${g.lat + d / 1.4}&layer=mapnik&marker=${g.lat},${g.lng}`;

  return (
    <article>
      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'TouristAttraction', name: g.name, url: abs(`/gems/${g.slug}`),
        geo: { '@type': 'GeoCoordinates', latitude: g.lat, longitude: g.lng },
        containedInPlace: { '@type': 'AdministrativeArea', name: g.stateName },
      }} />
      <GuideEnd {...(base
        ? { text: `${g.name} pairs well with ${base.d.name} (${base.km} km). Want both in one trip?`, label: 'Plan it free', href: planHref }
        : { text: `Like ${g.name}? Tell us your dates — we’ll sort the route, stay and transport.`, label: 'Plan it free', href: planHref })} />

      <div className="wrap pt-6">
        <Breadcrumbs items={[{ name: 'Hidden gems', path: '/hidden-gems' }, { name: g.stateName, path: `/hidden-gems/${g.stateSlug}` }, { name: g.name, path: `/gems/${g.slug}` }]} />
      </div>

      <header className="wrap mt-8 grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center" {...guide(inSeason ? `${monthLabel(now)} is a good month for ${g.name}.` : `${g.name} is best in ${g.months.slice(0, 3).map((m) => monthShort(m)).join(', ')} — save it for later.`, { label: 'Plan a trip here', href: planHref })}>
        <div className="relative">
          <GemArt g={g} className="aspect-[16/10] rounded-apple shadow-tile" />
          <span className="absolute left-5 top-5 rounded-full bg-black/45 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur">
            <span aria-hidden>{KIND_ICON(g.kind)}</span> {g.kind}
          </span>
        </div>
        <div className="min-w-0">
          <p className="kicker">{g.gem ? 'Hidden gem · ' : ''}{g.stateName}</p>
          <h1 className="mt-2 text-[40px] font-semibold leading-[1.05] tracking-tightest sm:text-[56px]">{g.name}</h1>
          <p className="mt-3 text-xl leading-snug text-mute">{g.area ? `${g.area}, ` : ''}{g.stateName}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {g.rating ? <span className="pill !text-sm"><span className="text-[#f5a623]">★</span>&nbsp;<b>{g.rating.toFixed(1)}</b>&nbsp;· {g.reviews?.toLocaleString('en-IN')} Google reviews</span> : null}
            {inSeason ? <span className="pill !bg-[#e3f9e5] !text-sm !text-[#1a7f37]">Good in {monthLabel(now)}</span> : g.months.length > 0 && <span className="pill !text-sm">Best {g.months.slice(0, 3).map((m) => monthShort(m)).join(', ')}</span>}
            {g.gem && <span className="pill !text-sm">Not crowded yet</span>}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={planHref} className="btn">Plan a trip here</Link>
            <a href={g.mapsUrl} target="_blank" rel="noreferrer" className="btn-secondary">Directions</a>
          </div>
        </div>
      </header>

      <div className="wrap mt-16 grid gap-12 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-14">
          <section {...guide(`Distances are rough — mountain roads take longer. We’ll give you the real route.`, { label: 'Get the route', href: planHref })}>
            <h2 className="text-[28px] font-semibold tracking-headline">Getting there</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {city && (
                <div className="card p-6">
                  <p className="text-sm text-mute">{airport?.c.slug === city.c.slug ? 'Nearest city & airport' : 'Nearest big city'}</p>
                  <p className="mt-1 text-xl font-semibold">{city.c.name}</p>
                  <p className="mt-1 text-[15px] text-mute">~{road(city.km)} km by road · about {drive(city.km)}</p>
                </div>
              )}
              {airport && airport.c.slug !== city?.c.slug && (
                <div className="card p-6">
                  <p className="text-sm text-mute">Nearest airport we track</p>
                  <p className="mt-1 text-xl font-semibold">{airport.c.name}</p>
                  <p className="mt-1 text-[15px] text-mute">~{road(airport.km)} km by road · about {drive(airport.km)}</p>
                </div>
              )}
            </div>
            <div className="mt-4 overflow-hidden rounded-apple bg-paper shadow-tile">
              <iframe title={`Map of ${g.name}`} src={osm} loading="lazy" className="h-[320px] w-full border-0" />
            </div>
            <p className="mt-2 text-xs text-faint">Map © <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a> · <a className="underline" href={g.mapsUrl} target="_blank" rel="noreferrer">Open in Google Maps</a></p>
          </section>

          <section>
            <h2 className="text-[28px] font-semibold tracking-headline">When to go</h2>
            <p className="mt-1 text-[17px] text-mute">{seasonNote}</p>
            <div className="mt-5 grid grid-cols-6 gap-1.5 sm:grid-cols-12">
              {allMonths.map((m) => (
                <span key={m} className={`rounded-xl py-2 text-center text-sm ${g.months.includes(m) ? 'bg-[#e3f9e5] font-semibold text-[#1a7f37]' : 'bg-paper text-faint'} ${m === now ? 'ring-2 ring-blue' : ''}`}>{monthShort(m)}</span>
              ))}
            </div>
          </section>

          {base && (
            <section {...guide(`${base.d.name} is the natural base — we’ve got the full guide.`, { label: 'Open guide', href: `/places/${base.d.slug}` })}>
              <h2 className="text-[28px] font-semibold tracking-headline">Make it a trip</h2>
              <p className="mt-1 text-[17px] text-mute">{base.km < 5 ? `Right in ${base.d.name}` : `${base.km} km from ${base.d.name}`} — our full guide has stays, budgets and travel times.</p>
              <div className="mt-5 max-w-md"><PlaceCard d={base.d} /></div>
            </section>
          )}

          {near.length > 0 && (
            <section {...guide('Stack two or three of these into one day.', { label: 'Plan a combo', href: planHref })}>
              <h2 className="text-[28px] font-semibold tracking-headline">More gems nearby</h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {near.map((x) => <GemCard key={x.id} g={asCard(x, x.distKm < 2 ? 'Right next to it' : `${x.distKm} km from here`)} />)}
              </div>
            </section>
          )}

          <section id="enquire" className="scroll-mt-16" {...guideQuiet}>
            <h2 className="text-[28px] font-semibold tracking-headline">Plan {g.name} with us</h2>
            <p className="mt-1 text-[17px] text-mute">Free itinerary on WhatsApp within 24 hours. No commitment.</p>
            <div className="mt-5">
              <LeadForm kind="enquiry" source={`/gems/${g.slug}`} places={base ? [{ slug: base.d.slug, name: base.d.name }] : []} defaultPlace={g.name} />
            </div>
          </section>

          <p className="text-xs text-faint">Place name, type and rating from Google Maps. Seasons are the usual travel window for the region — check local conditions before you go.</p>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-16 lg:self-start">
          <div className="card p-6">
            <p className="text-lg font-semibold">Going to {g.name}?</p>
            <p className="mt-1 text-[15px] text-mute">We’ll plan the route, stay and transport{base ? `, with ${base.d.name} as your base` : ''}.</p>
            <Link href={planHref} className="btn mt-4 w-full justify-center">Plan a trip here</Link>
            <Link href={`/hidden-gems/${g.stateSlug}`} className="mt-3 block text-center text-[15px] text-blue-link hover:underline">More gems in {g.stateName}</Link>
          </div>
        </aside>
      </div>
    </article>
  );
}
