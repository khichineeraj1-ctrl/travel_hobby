import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { readDb } from '@/lib/db';
import { fmtRange, nights, seatsLeft, todayIST } from '@/lib/booking';
import { BookShell, TrustCard } from '@/components/BookShell';
import { Checkout } from '@/components/Checkout';
import { PlaceArt } from '@/components/PlaceCard';
import { inr } from '@/lib/format';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Reserve your seat', robots: { index: false } };

export default async function BookTrip({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = readDb();
  const d = db.departures.find((x) => x.id === id && x.published);
  if (!d || d.startDate <= todayIST()) notFound();
  const place = db.destinations.find((x) => x.slug === d.destSlug);
  const left = seatsLeft(d, db.bookings);

  return (
    <BookShell
      crumbs={[{ name: 'Trips', path: '/trips' }, { name: d.title, path: `/book/trip/${d.id}` }]}
      title={`${d.title}.`}
      sub={`${place?.name ?? ''} · ${fmtRange(d.startDate, d.endDate)}`}
      aside={
        <>
          <div className="card overflow-hidden">
            {place && <PlaceArt d={place} className="aspect-[16/9]" />}
            <div className="p-6">
              <p className="text-2xl font-semibold">{inr(d.pricePerPerson)} <span className="text-sm font-normal text-mute">/ person</span></p>
              <p className="mt-1 text-sm text-mute">{nights(d.startDate, d.endDate)} nights · starts from {d.startsFrom} · {left} seats left</p>
              <p className="mt-4 text-sm font-semibold">Included</p>
              <ul className="mt-1 space-y-1 text-sm text-mute">{d.inclusions.map((x) => <li key={x}>✓ {x}</li>)}</ul>
              {d.exclusions.length > 0 && (<><p className="mt-3 text-sm font-semibold">Not included</p><ul className="mt-1 space-y-1 text-sm text-mute">{d.exclusions.map((x) => <li key={x}>– {x}</li>)}</ul></>)}
              {place && <Link href={`/places/${place.slug}`} className="link-arrow mt-4 text-sm">About {place.name}</Link>}
            </div>
          </div>
          <TrustCard />
        </>
      }
    >
      {left > 0 ? (
        <Checkout kind="trip" id={d.id} title={d.title} dates={fmtRange(d.startDate, d.endDate)} pricePerPerson={d.pricePerPerson} seatsLeft={left} source={`/book/trip/${d.id}`} />
      ) : (
        <div className="text-center">
          <p className="text-2xl font-semibold">This one’s sold out.</p>
          <p className="mt-2 text-mute">We can run another batch for your group.</p>
          <Link href={`/book/custom?place=${d.destSlug}`} className="btn mt-6">Request your own dates</Link>
        </div>
      )}
    </BookShell>
  );
}
