import Link from 'next/link';
import { readDb } from '@/lib/db';
import { fmtRange, nights, seatsLeft, staysFor, upcomingDepartures } from '@/lib/booking';
import { inr } from '@/lib/format';
import type { Departure, Stay } from '@/lib/types';

export function TripCard({ d, left, placeName }: { d: Departure; left: number; placeName?: string }) {
  const soldOut = left === 0;
  return (
    <div className="card flex flex-col p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-eyebrow">{soldOut ? 'Sold out' : left <= 3 ? `Only ${left} seats left` : 'Group trip'}</p>
      <h3 className="mt-1.5 text-xl font-semibold tracking-headline">{d.title}</h3>
      {placeName && <p className="text-sm text-mute">{placeName}</p>}
      <p className="mt-2 text-[15px]">{fmtRange(d.startDate, d.endDate)} · {nights(d.startDate, d.endDate)} nights</p>
      <p className="text-sm text-mute">Starts from {d.startsFrom}</p>
      <ul className="mt-3 space-y-1 text-sm text-mute">
        {d.inclusions.slice(0, 3).map((x) => <li key={x}>✓ {x}</li>)}
      </ul>
      <div className="mt-auto flex items-end justify-between pt-5">
        <p><span className="text-2xl font-semibold">{inr(d.pricePerPerson)}</span><span className="text-sm text-mute"> / person</span></p>
        {soldOut ? (
          <Link href={`/book/custom?place=${d.destSlug}`} className="btn-secondary btn-sm">Request dates</Link>
        ) : (
          <Link href={`/book/trip/${d.id}`} className="btn btn-sm">Reserve</Link>
        )}
      </div>
    </div>
  );
}

export function StayCard({ s }: { s: Stay }) {
  return (
    <div className="card flex flex-col overflow-hidden">
      {s.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.image} alt={s.name} className="aspect-[16/9] w-full object-cover" loading="lazy" />
      )}
      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-faint">{s.type}</p>
        <h3 className="mt-1 text-xl font-semibold tracking-headline">{s.name}</h3>
        <p className="mt-1.5 text-sm text-mute">{s.about}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">{s.amenities.slice(0, 4).map((a) => <span key={a} className="pill">{a}</span>)}</div>
        <div className="mt-auto flex items-end justify-between pt-5">
          <p><span className="text-2xl font-semibold">{inr(s.pricePerNight)}</span><span className="text-sm text-mute"> / room / night</span></p>
          <Link href={`/book/stay/${s.id}`} className="btn btn-sm">Check dates</Link>
        </div>
      </div>
    </div>
  );
}

/** "Book it." block on a place page */
export function BookSection({ destSlug, placeName }: { destSlug: string; placeName: string }) {
  const db = readDb();
  const trips = upcomingDepartures(db, destSlug);
  const stays = staysFor(db, destSlug);
  return (
    <section id="book" className="scroll-mt-16">
      <h2 className="text-[28px] font-semibold tracking-headline sm:text-[32px]">Book it. <span className="text-mute">Reserve now, pay later.</span></h2>
      <p className="mt-1 text-[17px] text-mute">No payment today. We confirm availability, then send a payment link.</p>
      {trips.length > 0 && (
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {trips.map((d) => <TripCard key={d.id} d={d} left={seatsLeft(d, db.bookings)} />)}
        </div>
      )}
      {stays.length > 0 && (
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {stays.map((s) => <StayCard key={s.id} s={s} />)}
        </div>
      )}
      <div className="card mt-5 flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="text-lg font-semibold">Want it your way?</p>
          <p className="text-[15px] text-mute">Your dates, your crew, your budget. We’ll plan {placeName} around you.</p>
        </div>
        <Link href={`/book/custom?place=${destSlug}`} className="btn-secondary">Request a custom trip</Link>
      </div>
    </section>
  );
}
