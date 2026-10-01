import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readDb } from '@/lib/db';
import { AdminHeader, Area, BackLink, Badge, ContactActions, Field, Flash, Panel, STATUS_TONE, Text } from '@/components/admin/ui';
import { fmtRange, KIND_LABEL, nights, roomsLeft, seatsLeft, STATUS_LABEL } from '@/lib/booking';
import { inr } from '@/lib/format';
import { updateBooking } from '../../../actions';

const Q: Record<string, string> = { event: 'For event', eventDates: 'Event dates', roadTrip: 'Road trip', gem: 'Hidden gem', placeText: 'Place (described)', flexibleWhen: 'When (flexible)', from: 'Starting from', crew: 'Who’s going', budget: 'Budget / person', stayStyle: 'Stay style', interests: 'Interests' };

export default async function BookingDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { id } = await params;
  const { ok, err } = await searchParams;
  const db = readDb();
  const b = db.bookings.find((x) => x.id === id);
  if (!b) notFound();
  const place = db.destinations.find((d) => d.slug === b.destSlug);
  const dep = b.departureId ? db.departures.find((d) => d.id === b.departureId) : undefined;
  const stay = b.stayId ? db.stays.find((s) => s.id === b.stayId) : undefined;
  const title = dep?.title ?? stay?.name ?? `Custom trip${place ? ` · ${place.name}` : ''}`;
  const firstName = b.contact.name.split(' ')[0];
  const wa = b.status === 'pending'
    ? `Hi ${firstName}! This is Beyond Explored about your ${KIND_LABEL[b.kind].toLowerCase()} request ${b.id} (${title}${b.checkIn && b.checkOut ? `, ${fmtRange(b.checkIn, b.checkOut)}` : ''}). `
    : `Hi ${firstName}, following up on booking ${b.id} (${title}). `;

  const rows: [string, React.ReactNode][] = [
    ['Type', KIND_LABEL[b.kind]],
    ['What', <>{title}{place && <Link href={`/places/${place.slug}`} target="_blank" className="ml-2 text-sm text-blue-link">view ↗</Link>}</>],
    ...(b.checkIn && b.checkOut ? [['Dates', `${fmtRange(b.checkIn, b.checkOut)} · ${nights(b.checkIn, b.checkOut)} nights`] as [string, string]] : []),
    ['Travellers', `${b.guests}${b.rooms ? ` · ${b.rooms} room(s)` : ''}`],
    ['Estimated total', b.total ? inr(b.total) : '— (quote needed)'],
    ['Received', new Date(b.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })],
    ...Object.entries(b.details).map(([k, v]) => [Q[k] ?? k, v] as [string, string]),
    ...(b.notes ? [['Traveller notes', b.notes] as [string, string]] : []),
  ];

  return (
    <>
      <BackLink href="/admin/bookings" label="All bookings" />
      <AdminHeader title={b.id} sub={`${b.contact.name} · ${title}`} action={<Badge tone={STATUS_TONE[b.status]}>{STATUS_LABEL[b.status]}</Badge>} />
      <Flash ok={ok} err={err} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Panel title="Booking">
            <dl className="divide-y divide-line/70">
              {rows.map(([k, v]) => (
                <div key={k} className="grid gap-1 py-2.5 sm:grid-cols-[180px_1fr]"><dt className="text-sm text-mute">{k}</dt><dd className="text-[15px]">{v}</dd></div>
              ))}
            </dl>
            {dep && <p className="text-sm text-mute">Trip capacity: {dep.seatsTotal - seatsLeft(dep, db.bookings)}/{dep.seatsTotal} seats taken.</p>}
            {stay && b.checkIn && b.checkOut && <p className="text-sm text-mute">Rooms still free for these dates (excluding this booking): {roomsLeft(stay, b.checkIn, b.checkOut, db.bookings, b.id)}/{stay.rooms}.</p>}
          </Panel>
          <Panel title="Update">
            <form action={updateBooking} className="space-y-5">
              <input type="hidden" name="id" value={b.id} />
              <div className="flex flex-wrap gap-2">
                {(['pending', 'confirmed', 'paid', 'cancelled'] as const).map((s) => (
                  <label key={s} className="cursor-pointer">
                    <input type="radio" name="status" value={s} defaultChecked={b.status === s} className="peer sr-only" />
                    <span className="chip peer-checked:border-blue peer-checked:bg-blue-soft peer-checked:ring-1 peer-checked:ring-blue">{STATUS_LABEL[s]}</span>
                  </label>
                ))}
              </div>
              <Field label="Final price (₹)" hint="Adjust after quoting a custom trip or applying a discount."><Text type="number" name="total" defaultValue={b.total ?? ''} className="max-w-[200px]" /></Field>
              <Field label="Internal notes" hint="Only visible in admin."><Area name="adminNotes" rows={3} defaultValue={b.adminNotes} /></Field>
              <button className="btn btn-sm">Save</button>
            </form>
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Traveller">
            <p className="text-lg font-semibold">{b.contact.name}</p>
            <p className="text-[15px] text-mute">{b.contact.phone}{b.contact.email ? <><br />{b.contact.email}</> : null}</p>
            <ContactActions phone={b.contact.phone} email={b.contact.email} message={wa} />
          </Panel>
          <Panel title="Traveller’s link" sub="Their private status page. Share if they lose it.">
            <code className="block break-all rounded-xl bg-paper p-3 text-xs">/booking/{b.id}?key={b.key}</code>
            <Link href={`/booking/${b.id}?key=${b.key}`} target="_blank" className="link-arrow text-sm">Open</Link>
          </Panel>
        </div>
      </div>
    </>
  );
}
