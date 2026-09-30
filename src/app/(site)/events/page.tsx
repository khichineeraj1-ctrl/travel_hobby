import { PageHead } from '@/components/Listing';
import { guide, guideQuiet } from '@/lib/guide';
import { EventCard } from '@/components/EventCard';
import { readDb } from '@/lib/db';
import { recentPastEvents, upcomingEvents } from '@/lib/events';
import { toDate } from '@/lib/booking';
import { JsonLd } from '@/lib/jsonld';
import { abs, meta } from '@/lib/seo';

export const metadata = meta({
  title: 'Festivals & events in India worth travelling for (2026–27)',
  description: 'Upcoming festivals, music events and seasonal spectacles across India — Hornbill, Rann Utsav, Pushkar, Ladakh monastery festivals and more — with dates, how to reach and where to stay.',
  path: '/events',
});

export default function Events() {
  const db = readDb();
  const upcoming = upcomingEvents(db);
  const past = recentPastEvents(db, 60);
  const byMonth = new Map<string, typeof upcoming>();
  upcoming.forEach((e) => {
    const k = toDate(e.startDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    byMonth.set(k, [...(byMonth.get(k) ?? []), e]);
  });
  return (
    <div className="wrap" {...guide('Spot one you like? Tap it — we’ll show how to get there and plan around it.', { label: 'Plan my trip', href: '/plan-my-trip' })}>
      <JsonLd
        data={upcoming.map((e) => ({
          '@context': 'https://schema.org', '@type': 'Event', name: e.name, startDate: e.startDate, endDate: e.endDate,
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', eventStatus: 'https://schema.org/EventScheduled',
          location: { '@type': 'Place', name: e.town, address: { '@type': 'PostalAddress', addressLocality: e.town, addressRegion: e.state, addressCountry: 'IN' } },
          url: abs(`/events/${e.slug}`), description: e.about,
        }))}
      />
      <PageHead crumbs={[{ name: 'Events', path: '/events' }]} kicker="Worth the journey" h1="Events." intro="Festivals, music, monastery dances and seasonal spectacles across India — with how to get there and where to stay." />
      {[...byMonth.entries()].map(([month, list]) => (
        <section key={month} className="mt-14">
          <h2 className="headline">{month}.</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{list.map((e) => <EventCard key={e.slug} e={e} wide />)}</div>
        </section>
      ))}
      {past.length > 0 && (
        <section className="mt-20">
          <h2 className="headline">Just missed. <span>Get alerts for the next one.</span></h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{past.map((e) => <EventCard key={e.slug} e={e} wide />)}</div>
        </section>
      )}
    </div>
  );
}
