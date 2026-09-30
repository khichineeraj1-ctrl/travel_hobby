import type { Metadata } from 'next';
import { GuideEnd } from '@/components/GuideEnd';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getAllDestinations, getCities, getDestination, getNearby, vibeById } from '@/lib/repo';
import { PlaceArt, PlaceCard } from '@/components/PlaceCard';
import { MonthStrip } from '@/components/MonthStrip';
import { CrewMeter } from '@/components/CrewMeter';
import { TravelTable } from '@/components/TravelTable';
import { WeatherWidget } from '@/components/WeatherWidget';
import { FromBanner } from '@/components/FromBanner';
import { BookSection } from '@/components/BookSection';
import { LeadForm } from '@/components/LeadForm';
import { EventCard } from '@/components/EventCard';
import { SpotAttribution, SpotCard } from '@/components/SpotList';
import { spotsFor } from '@/lib/places';
import { StayPrices } from '@/components/StayPrices';
import { RoadTripCard } from '@/components/RoadTrip';
import { eventsNear } from '@/lib/events';
import { readDb } from '@/lib/db';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { guide, guideQuiet } from '@/lib/guide';
import { currentMonth } from '@/lib/months';
import { JsonLd } from '@/lib/jsonld';
import { abs, meta } from '@/lib/seo';
import { estimateTravel } from '@/lib/travel';
import { crowdLabel, hrs, inr, sentence, signalLabel } from '@/lib/format';
import { monthLabel, monthName } from '@/lib/months';
import type { Destination } from '@/lib/types';


const bestRange = (d: Destination) => d.bestMonths.map((m) => monthLabel(m)).join(', ');

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = getDestination((await params).slug);
  if (!d) return {};
  return {
    ...meta({
      title: `${d.name}, ${d.state}: Best Time, How to Reach & Cost`,
      description: `${d.name}: ${d.hook} Best months: ${d.bestMonths.slice(0, 4).map((m) => monthLabel(m)).join(', ')}. Travel time from your city, live weather, solo vs family fit, budget from ${inr(d.budgetPerDay[0])}/day.`,
      path: `/places/${d.slug}`,
      image: `/og/place/${d.slug}`,
    }),
  };
}

export default async function PlacePage({ params }: { params: Promise<{ slug: string }> }) {
  const d = getDestination((await params).slug);
  if (!d) notFound();

  const cities = getCities();
  const rows = cities
    .map((c) => ({ slug: c.slug, name: c.name, t: estimateTravel(c, d, { cities }) }))
    .sort((a, b) => a.t.fastest.hours - b.t.fastest.hours);
  const estimates = Object.fromEntries(rows.map((r) => [r.slug, { name: r.name, t: r.t }]));

  // what the on-screen guide says in each section
  const now = currentMonth();
  const nowL = monthLabel(now);
  const season = d.bestMonths.includes(now) ? 'best' : d.okMonths.includes(now) ? 'ok' : 'skip';
  const skipWhy = d.skip.find((x) => x.months.includes(now))?.why;
  const fastest = rows[0];
  const G = {
    hero: season === 'best'
      ? guide(`Good timing — ${nowL} is peak season in ${d.name}. Want a free plan?`, { label: 'Plan it free', href: '#enquire' })
      : season === 'ok'
        ? guide(`${nowL} works for ${d.name}, with a few caveats. Here’s the honest picture ↓`, { label: 'Best time', href: '#best-time' })
        : guide(`Heads up: ${nowL} isn’t great for ${d.name}${skipWhy ? ` (${skipWhy})` : ''}. Want places that peak now?`, { label: `Best in ${nowL}`, href: `/when/${monthName(now)}` }),
    best: season === 'best'
      ? guide(`You’re in the window. Stays near ${d.name} fill up around now.`, { label: 'Check stays', href: '#book' })
      : guide(`Best months: ${bestRange(d)}. We can hold your spot and ping you before.`, { label: 'Remind me', href: '#enquire' }),
    weather: guide('Sky looks sorted? Now see how long it takes from your city.', { label: 'Travel time', href: '#how-to-reach' }),
    reach: guide(fastest ? `${hrs(fastest.t.fastest.hours)} from ${fastest.name}, the quickest start. Hate planning trains and cabs? We’ll do it.` : 'Trains, cabs, last-mile jeeps — we’ll sort the whole route.', { label: 'Free itinerary', href: '#enquire' }),
    crew: guide('Going with a squad or the fam? Group quotes are cheaper per head.', { label: 'Get a group quote', href: `/book/custom?place=${d.slug}` }),
    doThis: guide('We keep it honest — the ick is real. Still in? Let’s plan it.', { label: 'Plan it free', href: '#enquire' }),
    spots: guide('Liking these? We’ll stitch them into a day-by-day plan.', { label: 'Get the plan', href: '#enquire' }),
    events: guide('Time your trip with one of these — it changes the whole vibe.', { label: 'Plan around it', href: '#enquire' }),
    roads: guide('Would rather drive? These routes pass right through.', { label: 'Custom road trip', href: `/book/custom?place=${d.slug}` }),
    faq: guide('Still got a question? A real human replies on WhatsApp.', { label: 'Ask us', href: '#enquire' }),
    nearby: guide(`Not feeling ${d.name}? These are close — or let the dice decide.`, { label: 'Surprise me', href: '/roll' }),
  };

  const skipNote = d.skip.map((s) => `${s.months.map((m) => monthLabel(m)).join(', ')} (${s.why})`).join('; ');
  const faqs = [
    { q: `What is the best time to visit ${d.name}?`, a: `${bestRange(d)} are the best months to visit ${d.name}.${skipNote ? ` Avoid ${skipNote}.` : ''}` },
    { q: `How do I reach ${d.name}?`, a: [d.airport && `Nearest airport: ${d.airport.name}.`, d.railhead && `Nearest major railhead: ${d.railhead.name}.`, 'The last stretch is by road.'].filter(Boolean).join(' ') },
    { q: `Is ${d.name} good for solo travellers?`, a: `Solo fit ${d.crewFit.solo}/5, family fit ${d.crewFit.fam}/5. ${d.theIck[0] ?? ''}` },
    { q: `How many days do I need for ${d.name}?`, a: `Minimum ${d.minDays} days, ideally ${d.idealDays} including travel from the nearest hub.` },
    { q: `Is there mobile network in ${d.name}?`, a: `Expect ${signalLabel[d.signal]}. Download offline maps before you go.` },
    {
      q: `How much does a trip to ${d.name} cost?`,
      a: d.live
        ? `About ${inr(d.budgetPerDay[0])}–${inr(d.budgetPerDay[1])} per person per day, excluding travel to get there. Rooms near ${d.name} currently go for ${inr(d.live.stay.p25)}–${inr(d.live.stay.p75)} a night for two (typical ${inr(d.live.stay.median)}, cheapest ${inr(d.live.stay.min)}, across ${d.live.stay.count} stays), plus roughly ${inr(d.live.onGround[0])}–${inr(d.live.onGround[1])} per person for food and local transport.`
        : `Roughly ${inr(d.budgetPerDay[0])}–${inr(d.budgetPerDay[1])} per person per day on the ground, excluding travel to get there.`,
    },
  ];

  const Section = ({ id, title, sub, children, g }: { id?: string; title: string; sub?: React.ReactNode; children: React.ReactNode; g?: object }) => (
    <section id={id} className="scroll-mt-16" {...g}>
      <h2 className="text-[28px] font-semibold tracking-headline sm:text-[32px]">{title}</h2>
      {sub && <p className="mt-1 text-[17px] text-mute">{sub}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );

  return (
    <article>
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'TouristDestination',
            name: d.name,
            description: d.about,
            url: abs(`/places/${d.slug}`),
            image: d.image ? abs(d.image) : abs(`/og/place/${d.slug}`),
            geo: { '@type': 'GeoCoordinates', latitude: d.lat, longitude: d.lng, elevation: d.altitudeM },
            containedInPlace: { '@type': 'AdministrativeArea', name: d.state },
            touristType: d.vibes.map((v) => vibeById(v)?.label).filter(Boolean),
          },
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
          },
        ]}
      />

      <GuideEnd {...(season === 'skip'
        ? { text: `Read it all — but ${nowL} isn’t ${d.name}’s month. Here’s what’s peaking right now instead.`, label: `Best in ${nowL}`, href: `/when/${monthName(now)}` }
        : { text: `You read all of ${d.name} 👀 Sounds like the one? Get a free day-by-day plan on WhatsApp.`, label: 'Plan it free', href: '#enquire' })} />
      <div className="wrap pt-6">
        <Breadcrumbs items={[{ name: 'Places', path: '/places' }, { name: d.state, path: `/state/${d.stateSlug}` }, { name: d.name, path: `/places/${d.slug}` }]} />
      </div>

      <header className="wrap mt-8 grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center" {...G.hero}>
        <PlaceArt d={d} priority className="aspect-[16/10] rounded-apple shadow-tile" />
        <div>
          <p className="kicker">{d.state} · {d.altitudeM.toLocaleString('en-IN')}m</p>
          <h1 className="mt-2 text-[48px] font-semibold leading-none tracking-tightest sm:text-[64px]">{d.name}</h1>
          <p className="mt-4 text-2xl leading-snug text-mute">{d.hook}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {d.vibes.map((v) => {
              const vb = vibeById(v);
              return vb ? <Link key={v} href={`/vibe/${v}`} className="chip">{vb.emoji} {vb.label}</Link> : null;
            })}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="#book" className="btn">Book a trip</Link>
            <Link href="#enquire" className="btn-secondary">Get a free itinerary</Link>
          </div>
          {d.imageCredit && <p className="mt-4 text-xs text-faint">Photo: {d.imageCredit}</p>}
        </div>
      </header>

      <div className="wrap mt-16 grid gap-12 lg:grid-cols-[1fr_340px]">
        <div className="space-y-16">
          <section>
            <p className="text-xl leading-relaxed">{d.about}</p>
            <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ['Crowd', sentence(crowdLabel(d.crowd)), `${d.crowd}/5`],
                ['Network', sentence(signalLabel[d.signal]), ''],
                ['Budget / day', `${inr(d.budgetPerDay[0])}–${inr(d.budgetPerDay[1])}`, d.live ? 'per person · live stay prices' : 'per person · estimate'],
                ['Ideal trip', `${d.idealDays} days`, `min ${d.minDays}`],
              ].map(([k, v, sub]) => (
                <div key={k} className="card p-5">
                  <dt className="text-xs text-faint">{k}</dt>
                  <dd className="mt-1 text-[17px] font-semibold leading-snug">{v}</dd>
                  {sub && <dd className="text-xs text-mute">{sub}</dd>}
                </div>
              ))}
            </dl>
          </section>

          <Section g={G.best} id="best-time" title={`Best time to visit ${d.name}`} sub={`${bestRange(d)}.`}>
            <div className="card p-7">
              <MonthStrip d={d} />
              {d.skip.length > 0 && (
                <ul className="mt-5 space-y-1.5 text-[15px]">
                  {d.skip.map((s) => (
                    <li key={s.why}><span className="font-semibold">Skip {s.months.map((m) => monthLabel(m).slice(0, 3)).join(', ')}</span> <span className="text-mute">— {s.why}</span></li>
                  ))}
                </ul>
              )}
            </div>
          </Section>

          <Section g={G.weather} id="weather" title={`${d.name} weather right now`}>
            <WeatherWidget slug={d.slug} name={d.name} />
          </Section>

          <Section
            g={G.reach}
            id="how-to-reach"
            title={`How to reach ${d.name}`}
            sub={<>{d.airport ? <>Nearest airport: <b className="text-ink">{d.airport.name}</b>. </> : 'No nearby airport. '}{d.railhead ? <>Nearest railhead: <b className="text-ink">{d.railhead.name}</b>.</> : 'No practical railhead — road it is.'}</>}
          >
            <TravelTable rows={rows} />
          </Section>

          <Section g={G.crew} id="solo-or-family" title="Solo, squad or family?">
            <CrewMeter d={d} />
          </Section>

          <section className="grid gap-5 sm:grid-cols-2" {...G.doThis}>
            <div className="card p-7">
              <h2 className="text-2xl font-semibold tracking-headline">Do this.</h2>
              <ul className="mt-4 space-y-2.5 text-[15px]">{d.doThis.map((x) => <li key={x} className="flex gap-2"><span className="text-blue">●</span>{x}</li>)}</ul>
            </div>
            <div className="card p-7">
              <h2 className="text-2xl font-semibold tracking-headline">The ick. <span className="text-mute">Honestly.</span></h2>
              <ul className="mt-4 space-y-2.5 text-[15px]">{d.theIck.map((x) => <li key={x} className="flex gap-2"><span className="text-eyebrow">●</span>{x}</li>)}</ul>
            </div>
          </section>

          {(() => {
            const db = readDb();
            const evs = eventsNear(db, d);
            const roads = db.roadTrips.filter((r) => r.published && r.stops.some((s) => s.destSlug === d.slug));
            const spots = spotsFor(d.slug);
            return (
              <>
                {spots.length > 0 && (
                  <Section g={G.spots} id="spots" title={`Best spots around ${d.name}`} sub={spots[0].src === 'google' ? 'The highest-rated places within a short drive, ranked by what travellers actually rate them.' : 'Viewpoints, waterfalls, lakes and sights within a short drive.'}>
                    <div className="grid gap-4 sm:grid-cols-2">{spots.slice(0, 8).map((s) => <SpotCard key={s.id} s={s} />)}</div>
                    {spots.length > 8 && (
                      <details className="mt-4">
                        <summary className="link-arrow cursor-pointer list-none text-[15px]">{spots.length - 8} more spots</summary>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">{spots.slice(8).map((s) => <SpotCard key={s.id} s={s} />)}</div>
                      </details>
                    )}
                    <SpotAttribution spots={spots} />
                  </Section>
                )}
                {evs.length > 0 && (
                  <Section g={G.events} id="events" title={`Happening in & around ${d.name}`} sub="Time your trip with one of these.">
                    <div className="grid gap-5 sm:grid-cols-2">{evs.map((e) => <EventCard key={e.slug} e={e} wide />)}</div>
                  </Section>
                )}
                {roads.length > 0 && (
                  <Section g={G.roads} id="road-trips" title={`Road trips through ${d.name}`}>
                    <div className="grid gap-5 sm:grid-cols-2">{roads.map((r) => <RoadTripCard key={r.slug} t={r} />)}</div>
                  </Section>
                )}
              </>
            );
          })()}

          <div {...guideQuiet}><BookSection destSlug={d.slug} placeName={d.name} /></div>

          <Section g={guideQuiet} id="enquire" title={`Plan ${d.name} with us`} sub="Free itinerary on WhatsApp within 24 hours. No commitment.">
            <LeadForm kind="enquiry" source={`/places/${d.slug}`} places={[{ slug: d.slug, name: d.name }]} defaultPlace={d.name} />
          </Section>

          <Section g={G.faq} id="faq" title="Quick answers">
            <div className="card divide-y divide-line/70">
              {faqs.map((f) => (
                <details key={f.q} className="group px-7 py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-[17px] font-semibold">
                    {f.q}
                    <span className="ml-4 text-2xl font-light text-mute transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 text-[15px] text-mute">{f.a}</p>
                </details>
              ))}
            </div>
          </Section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-16 lg:self-start">
          <Suspense fallback={null}>
            <FromBanner estimates={estimates} />
          </Suspense>
          <div className="card p-6">
            <p className="text-sm text-mute">Where to stay</p>
            <div className="mt-3 flex flex-wrap gap-2">{d.stayTypes.map((s) => <span key={s} className="pill !text-sm !text-ink">{s}</span>)}</div>
            {d.live && <StayPrices r={d.live.stay} onGround={d.live.onGround} />}
          </div>
          <div className="card p-6">
            <p className="text-sm text-mute">Ready to go?</p>
            <p className="mt-1 text-[17px] font-semibold">Reserve a group trip or stay — nothing to pay today.</p>
            <div className="mt-4 flex flex-col gap-2">
              <Link href="#book" className="btn btn-sm">See trips & stays</Link>
              <Link href="#how-to-reach" className="link-arrow text-[15px]">How to get there</Link>
            </div>
          </div>
        </aside>
      </div>

      <section className="wrap mt-24" {...G.nearby}>
        <h2 className="headline">Nearby detours. <span>Add one on.</span></h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {getNearby(d).map((n) => <PlaceCard key={n.slug} d={n} />)}
        </div>
      </section>
    </article>
  );
}
