import Link from 'next/link';
import { Planner } from '@/components/Planner';
import { Tile } from '@/components/PlaceCard';
import { Rail } from '@/components/Rail';
import { getAllDestinations, getCities, getSettings, getVibes, getByVibe, planLookup } from '@/lib/repo';
import { currentMonth, monthLabel } from '@/lib/months';
import { parsePlan } from '@/lib/plan';
import { crowdLabel } from '@/lib/format';
import { TripCard } from '@/components/BookSection';
import { readDb } from '@/lib/db';
import { seatsLeft, upcomingDepartures } from '@/lib/booking';
import { EventCard } from '@/components/EventCard';
import { RoadTripCard } from '@/components/RoadTrip';
import { countdown, recentPastEvents, upcomingEvents } from '@/lib/events';


export default function Home() {
  const s = getSettings();
  const m = currentMonth();
  const all = getAllDestinations();
  const featured = s.featured.map((slug) => all.find((d) => d.slug === slug)).filter((d): d is NonNullable<typeof d> => !!d);
  const inSeason = all
    .filter((d) => d.bestMonths.includes(m) && !s.featured.includes(d.slug))
    .sort((a, b) => a.crowd - b.crowd);
  const rail = [...featured, ...inSeason].slice(0, 10);
  const vibes = getVibes();
  const cities = getCities();

  return (
    <>
      {/* hero */}
      <section className="wrap grid gap-10 pb-6 pt-14 sm:pt-20 lg:grid-cols-2 lg:items-end">
        <h1 className="text-[64px] font-semibold leading-none tracking-tightest sm:text-[96px]">{s.hero.title}</h1>
        <div className="lg:text-right">
          <p className="text-[28px] font-semibold leading-tight tracking-headline sm:text-[32px] lg:ml-auto lg:max-w-md">{s.hero.tagline}</p>
          <p className="mt-3 text-lg text-mute lg:ml-auto lg:max-w-md">{s.hero.sub}</p>
          <div className="mt-5 flex flex-col gap-2 text-[17px] lg:items-end">
            <Link href="#planner" className="text-blue-link hover:underline">{s.hero.primaryCta} ↗</Link>
            <Link href="/roll" prefetch={false} className="text-blue-link hover:underline">{s.hero.secondaryCta} ↗</Link>
          </div>
        </div>
      </section>

      {/* vibe rail — like the store's category nav */}
      <section aria-label="Browse by vibe" className="mt-8">
        <Rail label="Vibes">
          {vibes.map((v) => (
            <Link key={v.id} href={`/vibe/${v.id}`} className="group flex w-[128px] shrink-0 snap-start flex-col items-center text-center">
              <span className="flex h-[96px] w-[96px] items-center justify-center overflow-hidden rounded-3xl bg-white text-5xl shadow-tile transition group-hover:scale-105">
                {v.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.image} alt="" className="h-full w-full object-cover" />
                ) : v.emoji}
              </span>
              <span className="mt-3 text-sm font-semibold leading-tight">{v.label}</span>
              <span className="text-xs text-faint">{getByVibe(v.id).length} places</span>
            </Link>
          ))}
        </Rail>
      </section>

      {/* the latest → peaking now */}
      <section className="mt-16">
        <h2 className="wrap headline">
          {s.rail.title} <span>{s.rail.subtitle.replace('this month', `in ${monthLabel(m)}`)}</span>
        </h2>
        <Rail label="Featured places">
          {rail.map((d) => (
            <Tile key={d.slug} d={d} eyebrow={s.featured.includes(d.slug) ? 'Featured' : d.crowd <= 1 ? 'Hidden gem' : `Peak in ${monthLabel(m)}`} />
          ))}
        </Rail>
      </section>

      {/* events: what's about to happen + what people just missed */}
      {(() => {
        const db = readDb();
        const soon = upcomingEvents(db, 90);
        const missed = recentPastEvents(db, 30);
        if (!soon.length && !missed.length) return null;
        return (
          <section className="mt-16">
            <div className="wrap flex flex-wrap items-end justify-between gap-4">
              <h2 className="headline">Happening soon. <span>Events worth the journey.</span></h2>
              <Link href="/events" className="link-arrow text-[17px]">All events</Link>
            </div>
            <Rail label="Upcoming events">
              {soon.map((e) => <EventCard key={e.slug} e={e} />)}
            </Rail>
            {missed.length > 0 && (
              <div className="wrap">
                <div className="card flex flex-wrap items-center gap-x-8 gap-y-4 p-6">
                  <p className="text-[17px] font-semibold">Just missed:</p>
                  {missed.slice(0, 3).map((e) => (
                    <Link key={e.slug} href={`/events/${e.slug}`} className="group text-[15px]">
                      <span className="font-semibold group-hover:text-blue-link">{e.name}</span>
                      <span className="text-mute"> · {countdown(e).toLowerCase()} · {e.nextEdition ? e.nextEdition.toLowerCase() : 'back next year'}</span>
                      <span className="ml-1 text-blue-link">›</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        );
      })()}

      {/* road trips */}
      {(() => {
        const trips = readDb().roadTrips.filter((t) => t.published);
        if (!trips.length) return null;
        const m = currentMonth();
        trips.sort((a, b) => Number(b.bestMonths.includes(m)) - Number(a.bestMonths.includes(m)));
        return (
          <section className="mt-16">
            <div className="wrap flex flex-wrap items-end justify-between gap-4">
              <h2 className="headline">Road trips. <span>Routes, drive hours, fuel gaps.</span></h2>
              <Link href="/road-trips" className="link-arrow text-[17px]">All road trips</Link>
            </div>
            <Rail label="Road trips">{trips.map((t) => <RoadTripCard key={t.slug} t={t} rail />)}</Rail>
          </section>
        );
      })()}

      {/* upcoming group trips */}
      {(() => {
        const db = readDb();
        const trips = upcomingDepartures(db).slice(0, 6);
        if (!trips.length) return null;
        return (
          <section className="mt-16">
            <div className="wrap flex flex-wrap items-end justify-between gap-4">
              <h2 className="headline">Upcoming trips. <span>Small groups. Reserve now, pay later.</span></h2>
              <Link href="/trips" className="link-arrow text-[17px]">See all trips</Link>
            </div>
            <Rail label="Upcoming trips">
              {trips.map((t) => (
                <div key={t.id} className="w-[300px] shrink-0 snap-start sm:w-[340px]">
                  <TripCard d={t} left={seatsLeft(t, db.bookings)} placeName={db.destinations.find((d) => d.slug === t.destSlug)?.name} />
                </div>
              ))}
            </Rail>
          </section>
        );
      })()}

      {/* planner */}
      <section id="planner" className="mt-16 scroll-mt-16">
        <div className="wrap">
          <h2 className="headline">{s.planner.title} <span>{s.planner.subtitle}</span></h2>
          <div className="mt-8">
            <Planner
              initial={parsePlan({}, planLookup)}
              cities={cities}
              vibes={vibes}
              labels={{ submitLabel: s.planner.submitLabel, rollLabel: s.planner.rollLabel }}
            />
          </div>
        </div>
      </section>

      {/* leaving from */}
      <section className="mt-20">
        <h2 className="wrap headline">Leaving from. <span>Sorted by how fast you can actually get there.</span></h2>
        <Rail label="Starting cities">
          {cities.map((c) => (
            <Link key={c.slug} href={`/from/${c.slug}`} className="card card-hover flex h-[160px] w-[220px] shrink-0 snap-start flex-col justify-between p-6">
              <span className="text-xs font-semibold uppercase tracking-wide text-faint">Escape from</span>
              <span>
                <span className="block text-2xl font-semibold tracking-headline">{c.name}</span>
                <span className="link-arrow text-sm">See getaways</span>
              </span>
            </Link>
          ))}
        </Rail>
      </section>

      {/* enquiry band */}
      <section className="wrap mt-16">
        <div className="card flex flex-wrap items-center justify-between gap-6 bg-ink p-8 text-white sm:p-12">
          <div className="max-w-xl">
            <p className="text-[28px] font-semibold leading-tight tracking-headline sm:text-[36px]">Rather talk to a human?</p>
            <p className="mt-2 text-lg text-white/70">Tell us your dates and budget. Free itinerary on WhatsApp within 24 hours.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/plan-my-trip" className="btn">Plan my trip</Link>
            <Link href="/book/custom" className="inline-flex items-center rounded-full border border-white/40 px-[22px] py-[10px] text-[17px] text-white hover:bg-white hover:text-ink">Request a custom trip</Link>
          </div>
        </div>
      </section>

      {/* who's coming */}
      <section className="wrap mt-16">
        <h2 className="headline">Who’s coming. <span>Every place is rated for your crew.</span></h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['solo', 'Solo', 'Main character. Homestays where you’ll end up talking to strangers.'],
            ['duo', 'Couple', 'Quiet, scenic, zero crowd.'],
            ['squad', 'Squad', 'Split the cab, split the bonfire wood.'],
            ['fam', 'Family', 'Real beds, decent roads, no 4,500m surprises.'],
          ].map(([id, t, b]) => (
            <Link key={id} href={`/for/${id}`} className="card card-hover p-7">
              <p className="text-2xl font-semibold tracking-headline">{t}</p>
              <p className="mt-2 text-[15px] text-mute">{b}</p>
              <p className="link-arrow mt-4 text-[15px]">Explore</p>
            </Link>
          ))}
        </div>
      </section>

      {/* why */}
      <section className="wrap mt-16">
        <h2 className="headline">Why Beyond Explored. <span>Not another booking site.</span></h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {s.pitch.map((p) => (
            <div key={p.title} className="card p-7">
              <p className="text-xl font-semibold leading-snug tracking-headline">{p.title}</p>
              <p className="mt-2 text-[15px] text-mute">{p.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-faint">Crowd meter example: {crowdLabel(1)} → {crowdLabel(5)}.</p>
      </section>
    </>
  );
}
