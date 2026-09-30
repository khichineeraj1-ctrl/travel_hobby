import { PageHead } from '@/components/Listing';
import { TripCard } from '@/components/BookSection';
import { readDb } from '@/lib/db';
import { seatsLeft, upcomingDepartures, toDate } from '@/lib/booking';
import { JsonLd } from '@/lib/jsonld';
import { abs, meta } from '@/lib/seo';
import Link from 'next/link';

export const metadata = meta({
  title: 'Upcoming offbeat group trips in India — small groups, hidden places',
  description: 'Small-group trips to less-travelled places in India. Fixed dates, limited seats, reserve now and pay later.',
  path: '/trips',
});

export default function Trips() {
  const db = readDb();
  const trips = upcomingDepartures(db);
  const byMonth = new Map<string, typeof trips>();
  trips.forEach((t) => {
    const k = toDate(t.startDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    byMonth.set(k, [...(byMonth.get(k) ?? []), t]);
  });
  const name = (slug: string) => db.destinations.find((d) => d.slug === slug)?.name;

  return (
    <div className="wrap">
      <JsonLd
        data={trips.map((t) => ({
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: `${t.title} — ${name(t.destSlug)}`,
          startDate: t.startDate,
          endDate: t.endDate,
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          location: { '@type': 'Place', name: name(t.destSlug), address: t.startsFrom },
          offers: { '@type': 'Offer', price: t.pricePerPerson, priceCurrency: 'INR', availability: seatsLeft(t, db.bookings) ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut', url: abs(`/book/trip/${t.id}`) },
        }))}
      />
      <PageHead crumbs={[{ name: 'Trips', path: '/trips' }]} kicker="Small groups · reserve now, pay later" h1="Upcoming trips." intro="Fixed dates, 8–16 people, places most people never reach. Grab a seat — nothing to pay today." />
      {trips.length === 0 && <p className="card mt-10 p-8 text-mute">No trips scheduled right now. <Link href="/book/custom" className="link">Request a custom trip</Link>.</p>}
      {[...byMonth.entries()].map(([month, list]) => (
        <section key={month} className="mt-14">
          <h2 className="headline">{month}.</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((t) => <TripCard key={t.id} d={t} left={seatsLeft(t, db.bookings)} placeName={name(t.destSlug)} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
