import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readDb } from '@/lib/db';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { DIFF, RouteMap, RoadTripCard } from '@/components/RoadTrip';
import { EventCard } from '@/components/EventCard';
import { LeadForm } from '@/components/LeadForm';
import { legs, mapsLink, totals } from '@/lib/roadtrips';
import { upcomingEvents } from '@/lib/events';
import { km } from '@/lib/travel';
import { allMonths, monthLabel, monthShort } from '@/lib/months';
import { JsonLd } from '@/lib/jsonld';
import { abs, meta } from '@/lib/seo';


export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = readDb().roadTrips.find((x) => x.slug === slug && x.published);
  if (!t) return {};
  const x = totals(t);
  return meta({
    title: `${t.title} road trip — ${x.days}-day route, drive times & best time`,
    description: `${t.hook} ${x.km.toLocaleString('en-IN')} km over ${x.days} days: day-by-day route, drive hours, fuel stops, permits and best months (${t.bestMonths.map((m) => monthLabel(m)).join(', ')}).`,
    path: `/road-trips/${t.slug}`,
  });
}

export default async function RoadTripPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = readDb();
  const t = db.roadTrips.find((x) => x.slug === slug && x.published);
  if (!t) notFound();
  const x = totals(t);
  const L = legs(t);
  const events = upcomingEvents(db).filter((e) => e.roadTripSlug === t.slug || t.stops.some((s) => km(e, s) < 100));
  const others = db.roadTrips.filter((r) => r.published && r.slug !== t.slug).slice(0, 3);

  // arrive on `day`; staying n nights means you leave on day + n
  let day = 1;
  const plan = t.stops.map((s, i) => {
    const leg = i > 0 ? L[i - 1] : undefined;
    const last = i === t.stops.length - 1;
    const label = i === 0 ? 'Day 1' : last ? `Day ${day}` : s.nights > 1 ? `Day ${day}–${day + s.nights - 1}` : `Day ${day}`;
    day += s.nights;
    return { s, leg, label };
  });

  return (
    <article>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'TouristTrip',
          name: t.title,
          description: t.about,
          url: abs(`/road-trips/${t.slug}`),
          itinerary: { '@type': 'ItemList', itemListElement: t.stops.map((s, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'Place', name: s.name, geo: { '@type': 'GeoCoordinates', latitude: s.lat, longitude: s.lng } } })) },
        }}
      />
      <div className="wrap pt-6"><Breadcrumbs items={[{ name: 'Road trips', path: '/road-trips' }, { name: t.title, path: `/road-trips/${t.slug}` }]} /></div>

      <header className="wrap mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div className="card overflow-hidden"><RouteMap t={t} className="h-auto w-full" /></div>
        <div>
          <p className="kicker">{DIFF[t.difficulty]} · {t.vehicle}</p>
          <h1 className="mt-2 text-[44px] font-semibold leading-none tracking-tightest sm:text-[56px]">{t.title}</h1>
          <p className="mt-4 text-2xl leading-snug text-mute">{t.hook}</p>
          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[['Days', x.days], ['Distance', `${x.km.toLocaleString('en-IN')} km`], ['Driving', `~${Math.round(x.driveHours)} h`], ['Longest day', `${x.longestDay} h`]].map(([k, v]) => (
              <div key={k} className="card p-4"><dt className="text-xs text-faint">{k}</dt><dd className="text-lg font-semibold">{v}</dd></div>
            ))}
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/book/custom?roadtrip=${t.slug}`} className="btn">Plan it with us</Link>
            <a href={mapsLink(t)} target="_blank" rel="noopener" className="btn-secondary">Open in Google Maps ↗</a>
          </div>
        </div>
      </header>

      <div className="wrap mt-16 grid gap-12 lg:grid-cols-[1fr_340px]">
        <div className="space-y-14">
          <p className="text-xl leading-relaxed">{t.about}</p>

          <section>
            <h2 className="text-[28px] font-semibold tracking-headline sm:text-[32px]">The route, day by day</h2>
            <ol className="mt-6 space-y-0">
              {plan.map(({ s, leg, label }, i) => (
                <li key={i} className="relative grid grid-cols-[88px_1fr] gap-4 pb-8 last:pb-0">
                  {i < plan.length - 1 && <span className="absolute left-[99px] top-6 h-full w-0.5 bg-line" aria-hidden />}
                  <p className="pt-1 text-right text-sm font-semibold text-mute">{label}</p>
                  <div className="relative pl-6">
                    <span className={`absolute left-0 top-2 h-3 w-3 rounded-full ${i === 0 || i === plan.length - 1 ? 'bg-ink' : 'bg-blue'} ring-4 ring-paper`} aria-hidden />
                    {leg && <p className="text-xs text-faint">🚗 {leg.km} km · ~{leg.hours} h from {leg.from}</p>}
                    <p className="text-lg font-semibold">
                      {s.destSlug ? <Link href={`/places/${s.destSlug}`} className="hover:text-blue-link">{s.name} ›</Link> : s.name}
                      {s.nights > 0 && <span className="ml-2 text-sm font-normal text-mute">{s.nights} night{s.nights > 1 ? 's' : ''}</span>}
                    </p>
                    {s.note && <p className="text-[15px] text-mute">{s.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-xs text-faint">Distances and hours are estimates for planning. Mountain roads change with weather and roadworks.</p>
          </section>

          <section>
            <h2 className="text-[28px] font-semibold tracking-headline">When to go</h2>
            <div className="card mt-5 p-6">
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
                {allMonths.map((m) => (
                  <div key={m} className={`rounded-xl py-2.5 text-center text-sm font-medium ${t.bestMonths.includes(m) ? 'bg-blue text-white' : 'bg-paper text-faint'}`}>{monthShort(m)}</div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-5 sm:grid-cols-2">
            <div className="card p-7"><h2 className="text-2xl font-semibold tracking-headline">Don’t miss.</h2><ul className="mt-4 space-y-2.5 text-[15px]">{t.highlights.map((h) => <li key={h} className="flex gap-2"><span className="text-blue">●</span>{h}</li>)}</ul></div>
            <div className="card p-7"><h2 className="text-2xl font-semibold tracking-headline">The ick. <span className="text-mute">Honestly.</span></h2><ul className="mt-4 space-y-2.5 text-[15px]">{t.theIck.map((h) => <li key={h} className="flex gap-2"><span className="text-eyebrow">●</span>{h}</li>)}</ul></div>
          </section>

          {events.length > 0 && (
            <section>
              <h2 className="text-[28px] font-semibold tracking-headline">Time it with an event</h2>
              <p className="mt-1 text-mute">Happening on or near this route.</p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">{events.map((e) => <EventCard key={e.slug} e={e} wide />)}</div>
            </section>
          )}

          <section id="enquire">
            <h2 className="text-[28px] font-semibold tracking-headline">Want us to set it up?</h2>
            <p className="mb-5 mt-1 text-mute">Car + driver or self-drive, stays on every stop, permits sorted. Free plan on WhatsApp.</p>
            <LeadForm kind="enquiry" source={`/road-trips/${t.slug}`} places={[{ slug: t.slug, name: `Road trip: ${t.title}` }]} defaultPlace={`Road trip: ${t.title}`} />
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-16 lg:self-start">
          {(t.permits || t.fuelNote) && (
            <div className="card space-y-4 p-6 text-[15px]">
              {t.permits && <div><p className="text-sm text-mute">Permits</p><p className="font-semibold">{t.permits}</p></div>}
              {t.fuelNote && <div><p className="text-sm text-mute">Fuel</p><p className="font-semibold">{t.fuelNote}</p></div>}
            </div>
          )}
          <div className="card p-6">
            <p className="text-sm text-mute">Stops</p>
            <p className="mt-1 text-[15px] font-semibold">{t.stops.map((s) => s.name).filter((n, i, a) => a.indexOf(n) === i).join(' → ')}</p>
            <a href={mapsLink(t)} target="_blank" rel="noopener" className="link-arrow mt-3 text-sm">Navigate this route</a>
          </div>
        </aside>
      </div>

      {others.length > 0 && (
        <section className="wrap mt-24">
          <h2 className="headline">More road trips. <span>Keep driving.</span></h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">{others.map((o) => <RoadTripCard key={o.slug} t={o} />)}</div>
        </section>
      )}
    </article>
  );
}
