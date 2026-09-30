import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readDb } from '@/lib/db';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { CountdownPill, DateBlock, EventCard } from '@/components/EventCard';
import { PlaceCard } from '@/components/PlaceCard';
import { RoadTripCard } from '@/components/RoadTrip';
import { TripCard, StayCard } from '@/components/BookSection';
import { TravelTable } from '@/components/TravelTable';
import { LeadForm } from '@/components/LeadForm';
import { CATEGORY_LABEL, fmtEventDates, phase, travelTarget, upcomingEvents } from '@/lib/events';
import { addDays, seatsLeft, staysFor, upcomingDepartures } from '@/lib/booking';
import { estimateTravel, km } from '@/lib/travel';
import { JsonLd } from '@/lib/jsonld';
import { abs, meta } from '@/lib/seo';


const get = (slug: string) => readDb().events.find((e) => e.slug === slug && e.status === 'published');

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const e = get(slug);
  if (!e) return {};
  return meta({
    title: `${e.name} ${e.startDate.slice(0, 4)} — dates, how to reach ${e.town} & where to stay`,
    description: `${e.name}, ${e.town} (${e.state}): ${fmtEventDates(e)}. ${e.hook} Travel time from your city, tips and trips around it.`,
    path: `/events/${e.slug}`,
  });
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = readDb();
  const e = get(slug);
  if (!e) notFound();
  const p = phase(e);
  const place = e.destSlug ? db.destinations.find((d) => d.slug === e.destSlug && d.published !== false) : undefined;
  const road = e.roadTripSlug ? db.roadTrips.find((r) => r.slug === e.roadTripSlug && r.published) : undefined;
  const target = travelTarget(db, e);
  const cities = db.cities;
  const rows = target ? cities.map((c) => ({ slug: c.slug, name: c.name, t: estimateTravel(c, target, { cities }) })).sort((a, b) => a.t.fastest.hours - b.t.fastest.hours) : [];

  // inventory around the event dates
  const trips = e.destSlug ? upcomingDepartures(db, e.destSlug).filter((d) => d.startDate <= addDays(e.endDate, 3) && d.endDate >= addDays(e.startDate, -3)) : [];
  const stays = e.destSlug && p !== 'past' ? staysFor(db, e.destSlug) : [];
  const alsoSoon = upcomingEvents(db, 120).filter((x) => x.slug !== e.slug).sort((a, b) => km(a, e) - km(b, e)).slice(0, 3);
  const planHref = `/book/custom?event=${e.slug}${e.destSlug ? `&place=${e.destSlug}` : ''}`;

  return (
    <article>
      <JsonLd
        data={{
          '@context': 'https://schema.org', '@type': 'Event', name: e.name, startDate: e.startDate, endDate: e.endDate, description: e.about,
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', eventStatus: 'https://schema.org/EventScheduled',
          location: { '@type': 'Place', name: e.town, geo: { '@type': 'GeoCoordinates', latitude: e.lat, longitude: e.lng }, address: { '@type': 'PostalAddress', addressLocality: e.town, addressRegion: e.state, addressCountry: 'IN' } },
          url: abs(`/events/${e.slug}`), ...(e.image ? { image: abs(e.image) } : {}),
        }}
      />
      <div className="wrap pt-6"><Breadcrumbs items={[{ name: 'Events', path: '/events' }, { name: e.name, path: `/events/${e.slug}` }]} /></div>

      <header className="wrap mt-8">
        <div className={`card overflow-hidden ${e.image ? '' : 'bg-ink text-white'}`}>
          <div className="relative grid gap-8 p-8 sm:p-12 lg:grid-cols-[auto_1fr] lg:items-center">
            {e.image && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.image} alt={e.name} className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/55" />
              </>
            )}
            <DateBlock date={e.startDate} className="relative !h-24 !w-24 [&>span:last-child]:!text-4xl" />
            <div className={`relative ${e.image ? 'text-white' : ''}`}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold uppercase tracking-wide text-[#ff9f5a]">{CATEGORY_LABEL[e.category]}</span>
                <CountdownPill e={e} />
              </div>
              <h1 className="mt-2 text-[40px] font-semibold leading-none tracking-tightest sm:text-[64px]">{e.name}</h1>
              <p className="mt-3 text-xl text-white/80">{e.hook}</p>
              <p className="mt-3 text-[17px] text-white/70">{fmtEventDates(e)}{e.dateStatus === 'expected' ? ' · dates expected, not yet announced' : ''} · {e.town}, {e.state}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                {p !== 'past' ? <Link href={planHref} className="btn">Plan my trip for this</Link> : place ? <Link href={`/places/${place.slug}`} className="btn">Go anyway — it’s still great</Link> : null}
                <Link href="#alerts" className="inline-flex items-center rounded-full border border-white/40 px-[22px] py-[10px] text-[17px] text-white hover:bg-white hover:text-ink">{p === 'past' ? 'Alert me next year' : 'Alert me'}</Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {p === 'past' && (
        <div className="wrap mt-6">
          <div className="card flex flex-wrap items-center justify-between gap-4 bg-[#fff4e5] p-6">
            <p className="text-[17px]"><b>You just missed it.</b> {e.recurring === 'annual' ? `It’s annual — ${e.nextEdition ?? 'back next year'}.` : ''} {place || road ? 'The place itself is still worth the trip right now.' : ''}</p>
            <Link href="#alerts" className="btn btn-sm">Get next year’s dates</Link>
          </div>
        </div>
      )}

      <div className="wrap mt-14 grid gap-12 lg:grid-cols-[1fr_340px]">
        <div className="space-y-14">
          <section>
            <p className="text-xl leading-relaxed">{e.about}</p>
            {e.tips.length > 0 && (
              <div className="card mt-6 p-7">
                <h2 className="text-xl font-semibold">Know before you go</h2>
                <ul className="mt-3 space-y-2 text-[15px]">{e.tips.map((t) => <li key={t} className="flex gap-2"><span className="text-blue">●</span>{t}</li>)}</ul>
              </div>
            )}
          </section>

          {(trips.length > 0 || stays.length > 0) && (
            <section>
              <h2 className="text-[28px] font-semibold tracking-headline">Go with us</h2>
              <p className="mt-1 text-mute">Trips and stays around the event dates. Reserve now, pay later.</p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {trips.map((d) => <TripCard key={d.id} d={d} left={seatsLeft(d, db.bookings)} />)}
                {stays.map((s) => <StayCard key={s.id} s={s} />)}
              </div>
            </section>
          )}

          {rows.length > 0 && (
            <section>
              <h2 className="text-[28px] font-semibold tracking-headline">How to reach {e.town}</h2>
              <p className="mb-5 mt-1 text-mute">Estimated door-to-door time from major cities.</p>
              <TravelTable rows={rows} />
            </section>
          )}

          <section id="alerts" className="scroll-mt-20">
            <div className="card p-7 sm:p-8">
              <h2 className="text-2xl font-semibold tracking-headline">{p === 'past' ? 'Don’t miss the next one.' : 'Get a heads-up.'}</h2>
              <p className="mb-5 mt-1 text-mute">{p === 'past' ? 'We’ll message you when next year’s dates drop, with stays before they sell out.' : 'Date changes, stays that are still free, and group trips going — straight to WhatsApp.'}</p>
              <LeadForm kind="event" source={`/events/${e.slug}`} event={{ slug: e.slug, name: e.name, dates: fmtEventDates(e), past: p === 'past' }} />
            </div>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-16 lg:self-start">
          {place && <PlaceCard d={place} />}
          {road && <RoadTripCard t={road} />}
          {e.sourceUrl && (
            <div className="card p-6 text-sm">
              <p className="text-mute">Dates source</p>
              <a href={e.sourceUrl} target="_blank" rel="noopener nofollow" className="link-arrow mt-1 break-all">{(() => { try { return new URL(e.sourceUrl!).hostname.replace('www.', ''); } catch { return 'source'; } })()}</a>
              <p className="mt-2 text-xs text-faint">Always double-check with organisers before booking travel.</p>
            </div>
          )}
        </aside>
      </div>

      {alsoSoon.length > 0 && (
        <section className="wrap mt-24">
          <h2 className="headline">Also coming up. <span>Nearest first.</span></h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">{alsoSoon.map((x) => <EventCard key={x.slug} e={x} wide />)}</div>
        </section>
      )}
    </article>
  );
}
