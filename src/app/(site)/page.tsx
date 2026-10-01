import Link from 'next/link';
import { meta } from '@/lib/seo';
import { GuideEnd } from '@/components/GuideEnd';
import { guide, guideQuiet } from '@/lib/guide';
import { assistantEnabled } from '@/lib/assistant';
import { MicButton } from '@/components/AskBeyond';
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
import { HomeSearch } from '@/components/HomeSearch';
import { SpotCard } from '@/components/SpotList';
import { catalog, stats } from '@/lib/catalog';
import { INDIA_STATES } from '@/lib/gems';
import { STATE_SEASON } from '@/data/state-seasons';
import { monthShort } from '@/lib/months';


export const metadata = meta({
  title: 'Beyond Explored: Offbeat India Places & Trip Planner',
  description: 'Find offbeat, uncrowded places in India. Real travel times from your city, live weather, honest costs and the best month to go — solo, squad or family.',
  path: '/',
});

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

  // the bigger catalogue: our guides + all-India hidden gems
  const st = stats();
  const ask = assistantEnabled();
  const gemCount: Record<string, number> = {};
  for (const i of catalog()) if (i.kind === 'gem') gemCount[i.stateSlug] = (gemCount[i.stateSlug] ?? 0) + 1;
  // in-season states with the most to show first (rotated daily among the top 8)
  const seasonStates = INDIA_STATES.filter((x) => STATE_SEASON[x.slug]?.includes(m) && (gemCount[x.slug] ?? 0) >= 8)
    .sort((a, b) => (gemCount[b.slug] ?? 0) - (gemCount[a.slug] ?? 0)).slice(0, 8);
  const day = Math.floor(Date.now() / 86_400_000);
  const pick = <T,>(arr: T[], k: number) => Array.from({ length: Math.min(k, arr.length) }, (_, i) => arr[(day + i * 7) % arr.length]);
  const chips = [
    { label: `📅 Good in ${monthLabel(m)}`, href: `/explore?month=${m}` },
    ...(m >= 7 && m <= 10 ? [{ label: '💧 Monsoon waterfalls', href: `/explore?type=water&month=${m}` }] : []),
    ...([12, 1, 2].includes(m) ? [{ label: '❄️ Snow trips', href: `/explore?q=snow&month=${m}` }] : []),
    { label: '🥾 Treks', href: '/explore?type=wild' },
    { label: '🏰 Forts & ruins', href: '/explore?type=heritage' },
    ...pick(seasonStates, 3).map((x) => ({ label: `📍 ${x.name}`, href: `/hidden-gems/${x.slug}` })),
    { label: '💎 Hidden gems', href: '/hidden-gems' },
  ];
  // in-season gems across India: best few per in-season state, rotating daily
  const nowGems = (() => {
    const items = catalog().filter((i) => i.kind === 'gem' && i.months.includes(m) && (i.rating ?? 0) >= 4.5);
    const byState: Record<string, typeof items> = {};
    for (const i of items) (byState[i.stateSlug] ??= []).push(i);
    const states = Object.keys(byState);
    const out: typeof items = [];
    for (let r = 0; out.length < 12 && r < 3; r++) for (let k = 0; k < states.length && out.length < 12; k++) {
      const sl = states[(day + k) % states.length];
      if (byState[sl][r]) out.push(byState[sl][r]);
    }
    return out;
  })();

  return (
    <>
      <GuideEnd text="Scrolled the whole thing and still undecided? That’s what the dice are for — or tell us 4 things." label="Match me" href="/plan-my-trip" />
      {/* hero */}
      <section className="wrap grid gap-10 pb-6 pt-14 sm:pt-20 lg:grid-cols-2 lg:items-end" {...guide('Hey 👋 no idea where to go? Tell us 4 things and we’ll match you in 10 seconds.', { label: 'Match me', href: '#planner' })}>
        <h1 className="text-[64px] font-semibold leading-none tracking-tightest sm:text-[96px]">{s.hero.title}</h1>
        <div className="lg:text-right">
          <p className="text-[28px] font-semibold leading-tight tracking-headline sm:text-[32px] lg:ml-auto lg:max-w-md">{s.hero.tagline}</p>
          <p className="mt-3 text-lg text-mute lg:ml-auto lg:max-w-md">{s.hero.sub}</p>
          <div className="mt-5 flex flex-col gap-2 text-[17px] lg:items-end">
            <Link href="#planner" className="text-blue-link hover:underline">{s.hero.primaryCta} ↗</Link>
            <Link href="/roll" prefetch={false} className="text-blue-link hover:underline">{s.hero.secondaryCta} ↗</Link>
            {assistantEnabled() && <MicButton className="inline-flex items-center gap-1.5 text-blue-link hover:underline lg:justify-end" label="Or just ask out loud" />}
          </div>
        </div>
      </section>

      {/* search: the whole catalogue, type it like you'd say it */}
      <section className="wrap mt-6 sm:mt-10" aria-label="Search places" {...guide('Type anything — a state, a month, “waterfalls”, “forts”. We’ll find it.', { label: 'Browse everything', href: '/explore' })}>
        <HomeSearch total={st.guides + st.gems} states={st.states} chips={chips} ask={ask} />
      </section>

      {/* vibe rail — like the store's category nav */}
      <section aria-label="Browse by vibe" className="mt-8" {...guide('Pick a mood, not a destination. Tap any vibe.', { label: 'Or let the dice pick', href: '/roll' })}>
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
      <section className="mt-16" {...guide(`These are at their best right now. Swipe → and tap one that looks like you.`, { label: 'See all', href: '/places' })}>
        <h2 className="wrap headline">
          {s.rail.title} <span>{s.rail.subtitle.replace('this month', `in ${monthLabel(m)}`)}</span>
        </h2>
        <Rail label="Featured places">
          {rail.map((d) => (
            <Tile key={d.slug} d={d} eyebrow={s.featured.includes(d.slug) ? 'Featured' : d.crowd <= 1 ? 'Hidden gem' : `Peak in ${monthLabel(m)}`} />
          ))}
        </Rail>
      </section>

      {nowGems.length > 0 && (
        <section className="wrap mt-16" {...guide(`These are in season right now in ${seasonStates.length} states. Tap one to open it in Maps.`, { label: `All of ${monthLabel(m)}`, href: `/explore?month=${m}` })}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="headline">Good right now. <span>Hidden gems across India in {monthLabel(m)}.</span></h2>
            <Link href={`/explore?month=${m}`} className="link-arrow text-[17px]">See all</Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {nowGems.slice(0, 9).map((g) => (
              <SpotCard key={g.id} s={{ id: g.id, name: g.name, kind: g.label, rating: g.rating, reviews: g.reviews, mapsUrl: g.href, gem: g.gem, area: g.area ?? g.stateName, lat: 0, lng: 0, distKm: 0, src: 'google' }} note={`${g.stateName} · best ${g.months.slice(0, 4).map((x) => monthShort(x)).join(', ')}${g.months.length > 4 ? '…' : ''}`} />
            ))}
          </div>
          <p className="mt-4 text-xs text-faint">Ratings and places from Google Maps.</p>
        </section>
      )}

      {/* events: what's about to happen + what people just missed */}
      {(() => {
        const db = readDb();
        const soon = upcomingEvents(db, 90);
        const missed = recentPastEvents(db, 30);
        if (!soon.length && !missed.length) return null;
        return (
          <section className="mt-16" {...guide(soon[0] ? `${soon[0].name} is coming up. Trips around events sell out first.` : 'Missed one? Get alerts before the next edition.', { label: soon[0] ? 'Plan around it' : 'All events', href: soon[0] ? `/events/${soon[0].slug}` : '/events' })}>
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
          <section className="mt-16" {...guide('Want the journey to be the trip? Real drive hours, fuel gaps and permits here.', { label: 'All road trips', href: '/road-trips' })}>
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
          <section className="mt-16" {...guide('Don’t want to plan at all? Join a small group — nothing to pay today.', { label: 'See trips', href: '/trips' })}>
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
      <section id="planner" className="mt-16 scroll-mt-16" {...guideQuiet}>
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
      <section className="mt-20" {...guide('Pick your city — every place shows real door-to-door travel time from there.', { label: 'All cities', href: '/from' })}>
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
      <section className="wrap mt-16" {...guideQuiet}>
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
      <section className="wrap mt-16" {...guide('Solo, couple, squad or fam — every place is rated for your crew.', { label: 'Get a custom plan', href: '/book/custom' })}>
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
      <section className="wrap mt-16" {...guide('No ads, no paid rankings. Just places worth the detour.', { label: 'Start exploring', href: '/places' })}>
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
