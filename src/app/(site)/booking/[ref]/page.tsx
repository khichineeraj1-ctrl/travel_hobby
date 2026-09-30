import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { readDb } from '@/lib/db';
import { fmtRange, KIND_LABEL, nights, STATUS_LABEL } from '@/lib/booking';
import { inr } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your booking', robots: { index: false } };

export default async function BookingPage({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ key?: string }> }) {
  const { ref } = await params;
  const { key } = await searchParams;
  const db = readDb();
  const b = db.bookings.find((x) => x.id === ref);
  if (!b || !key || key !== b.key) notFound(); // the secret key keeps booking pages private

  const place = db.destinations.find((d) => d.slug === b.destSlug);
  const dep = b.departureId ? db.departures.find((d) => d.id === b.departureId) : undefined;
  const stay = b.stayId ? db.stays.find((s) => s.id === b.stayId) : undefined;
  const title = dep?.title ?? stay?.name ?? `Custom trip${place ? ` to ${place.name}` : ''}`;
  const tone = { pending: 'bg-[#fff4e5] text-eyebrow', confirmed: 'bg-blue-soft text-blue-link', paid: 'bg-[#e9f7ee] text-good', cancelled: 'bg-paper text-mute' }[b.status];

  return (
    <div className="wrap-narrow py-14">
      <div className="card p-8 text-center sm:p-12">
        <p className="text-5xl">{b.status === 'cancelled' ? '✕' : '✓'}</p>
        <h1 className="mt-4 text-[36px] font-semibold tracking-tightest">
          {b.status === 'pending' ? (b.kind === 'custom' ? 'Request received.' : 'You’re on the list.') : b.status === 'cancelled' ? 'Booking cancelled.' : 'You’re confirmed.'}
        </h1>
        <p className="mt-2 text-lg text-mute">
          {b.status === 'pending'
            ? `We’ll WhatsApp ${b.contact.phone} within 24 hours to ${b.kind === 'custom' ? 'share your plan and quote' : 'confirm and send a payment link'}.`
            : b.status === 'confirmed' ? 'Watch your WhatsApp for the payment link.' : b.status === 'paid' ? 'Payment received. See you out there.' : 'Reach out if this was a mistake.'}
        </p>
        <span className={`mt-5 inline-flex rounded-full px-3 py-1 text-sm font-medium ${tone}`}>{STATUS_LABEL[b.status]}</span>
      </div>

      <div className="card mt-6 p-8">
        <dl className="grid gap-5 sm:grid-cols-2">
          <div><dt className="text-sm text-mute">Booking reference</dt><dd className="font-mono text-lg font-semibold">{b.id}</dd></div>
          <div><dt className="text-sm text-mute">Type</dt><dd className="text-lg font-semibold">{KIND_LABEL[b.kind]}</dd></div>
          <div><dt className="text-sm text-mute">What</dt><dd className="font-semibold">{title}</dd></div>
          {b.checkIn && b.checkOut && <div><dt className="text-sm text-mute">Dates</dt><dd className="font-semibold">{fmtRange(b.checkIn, b.checkOut)} · {nights(b.checkIn, b.checkOut)} nights</dd></div>}
          {!b.checkIn && b.details.flexibleWhen && <div><dt className="text-sm text-mute">When</dt><dd className="font-semibold">{b.details.flexibleWhen}</dd></div>}
          <div><dt className="text-sm text-mute">Travellers</dt><dd className="font-semibold">{b.guests}{b.rooms ? ` · ${b.rooms} room${b.rooms > 1 ? 's' : ''}` : ''}</dd></div>
          {b.total ? <div><dt className="text-sm text-mute">Estimated total</dt><dd className="font-semibold">{inr(b.total)} <span className="text-sm font-normal text-mute">(pay after confirmation)</span></dd></div> : null}
          <div><dt className="text-sm text-mute">Name</dt><dd className="font-semibold">{b.contact.name}</dd></div>
        </dl>
        <p className="mt-6 border-t border-line pt-5 text-sm text-mute">Bookmark this page — it’s your private link to check status. Quote <b className="text-ink">{b.id}</b> if you message us.</p>
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {place && <Link href={`/places/${place.slug}`} className="btn-secondary">Read up on {place.name}</Link>}
        <Link href="/" className="btn">Back to exploring</Link>
      </div>
    </div>
  );
}
