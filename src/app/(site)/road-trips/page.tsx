import { PageHead } from '@/components/Listing';
import { GuideEnd } from '@/components/GuideEnd';
import { RoadTripCard } from '@/components/RoadTrip';
import { readDb } from '@/lib/db';
import { currentMonth, monthLabel } from '@/lib/months';
import { JsonLd } from '@/lib/jsonld';
import { itemListLd, meta } from '@/lib/seo';

export const metadata = meta({
  title: 'Offbeat road trips in India — routes, drive times & best season',
  description: 'Epic Indian road trips with day-by-day routes, drive hours, fuel stops, permits and the best months to go — Manali–Leh, Spiti, Zanskar, Konkan, Tawang, Kutch and more.',
  path: '/road-trips',
});

export default function RoadTrips() {
  const m = currentMonth();
  const trips = readDb().roadTrips.filter((t) => t.published);
  const now = trips.filter((t) => t.bestMonths.includes(m));
  const later = trips.filter((t) => !t.bestMonths.includes(m));
  return (
    <div className="wrap">
      <GuideEnd text="Seen every route? Tell us your car, days and crew — we’ll suggest the drive." label="Plan my drive" href="/book/custom" />
      <JsonLd data={itemListLd('Offbeat road trips in India', trips.map((t) => ({ name: t.title, path: `/road-trips/${t.slug}` })))} />
      <PageHead crumbs={[{ name: 'Road trips', path: '/road-trips' }]} kicker="Self-drive · or we plan it" h1="Road trips." intro="Routes, real drive hours, fuel gaps and permits. Take the wheel, or let us sort the stays and the car." />
      {now.length > 0 && (
        <section className="mt-12">
          <h2 className="headline">In season. <span>Good to go in {monthLabel(m)}.</span></h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{now.map((t) => <RoadTripCard key={t.slug} t={t} />)}</div>
        </section>
      )}
      {later.length > 0 && (
        <section className="mt-16">
          <h2 className="headline">Plan ahead. <span>Their season comes later.</span></h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{later.map((t) => <RoadTripCard key={t.slug} t={t} />)}</div>
        </section>
      )}
    </div>
  );
}
