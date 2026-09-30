import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readDb } from '@/lib/db';
import { AdminHeader, Area, BackLink, Check, DangerZone, Field, Flash, Panel, Select, Text } from '@/components/admin/ui';
import { seatsLeft } from '@/lib/booking';
import { deleteDeparture, saveDeparture } from '../../../actions';
import type { Departure } from '@/lib/types';

const BLANK: Departure = { id: '', destSlug: '', title: '', startDate: '', endDate: '', pricePerPerson: 9999, seatsTotal: 12, startsFrom: '', inclusions: [], exclusions: [], published: true };

export default async function EditTrip({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { id } = await params;
  const { ok, err } = await searchParams;
  const db = readDb();
  const isNew = id === 'new';
  const d = isNew ? BLANK : db.departures.find((x) => x.id === id);
  if (!d) notFound();
  const booked = isNew ? 0 : d.seatsTotal - seatsLeft(d, db.bookings);
  const bookings = db.bookings.filter((b) => b.departureId === d.id && b.status !== 'cancelled');

  return (
    <>
      <BackLink href="/admin/trips" label="All trips" />
      <AdminHeader title={isNew ? 'New group trip' : d.title} sub={isNew ? undefined : `${booked}/${d.seatsTotal} seats taken`} action={!isNew ? <Link href={`/book/trip/${d.id}`} target="_blank" className="btn-secondary !py-2 !text-[15px]">View booking page ↗</Link> : undefined} />
      <Flash ok={ok} err={err} />
      <form action={saveDeparture} className="space-y-6">
        <input type="hidden" name="originalId" value={isNew ? '' : d.id} />
        <Panel title="Trip">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Title"><Text name="title" defaultValue={d.title} required placeholder="Chandrashila sunrise trek" /></Field>
            <Field label="Place">
              <Select name="destSlug" defaultValue={d.destSlug} required>
                <option value="">Choose…</option>
                {db.destinations.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="Start date"><Text type="date" name="startDate" defaultValue={d.startDate} required /></Field>
            <Field label="End date"><Text type="date" name="endDate" defaultValue={d.endDate} required /></Field>
            <Field label="Price per person (₹)"><Text type="number" name="pricePerPerson" min={0} step={100} defaultValue={d.pricePerPerson} /></Field>
            <Field label="Total seats" hint={booked ? `${booked} already booked` : undefined}><Text type="number" name="seatsTotal" min={Math.max(1, booked)} defaultValue={d.seatsTotal} /></Field>
          </div>
          <Field label="Starts from"><Text name="startsFrom" defaultValue={d.startsFrom} placeholder="e.g. Rishikesh / Guwahati airport" /></Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Included (one per line)"><Area name="inclusions" rows={5} defaultValue={d.inclusions.join('\n')} /></Field>
            <Field label="Not included (one per line)"><Area name="exclusions" rows={5} defaultValue={d.exclusions.join('\n')} /></Field>
          </div>
          <Check name="published" label="On sale (visible on the site)" defaultChecked={d.published} />
          <button className="btn">{isNew ? 'Create trip' : 'Save trip'}</button>
        </Panel>
      </form>
      {!isNew && (
        <>
          <section className="card mt-6 p-6">
            <h2 className="text-lg font-semibold">Travellers ({bookings.reduce((n, b) => n + b.guests, 0)})</h2>
            <ul className="mt-3 divide-y divide-line/70">
              {bookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between py-2.5 text-[15px]">
                  <span>{b.contact.name} · {b.guests} pax <span className="text-sm text-faint">{b.contact.phone}</span></span>
                  <Link href={`/admin/bookings/${b.id}`} className="font-mono text-sm text-blue-link">{b.id} · {b.status}</Link>
                </li>
              ))}
              {bookings.length === 0 && <li className="py-2.5 text-mute">No bookings yet.</li>}
            </ul>
          </section>
          <section className="card mb-10 mt-6 border border-[#ffd2cc] p-6">
            <h2 className="mb-4 text-lg font-semibold">Delete trip</h2>
            <DangerZone action={deleteDeparture} hidden={{ id: d.id }} what="this trip" />
          </section>
        </>
      )}
    </>
  );
}
