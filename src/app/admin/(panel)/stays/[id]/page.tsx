import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readDb } from '@/lib/db';
import { AdminHeader, Area, BackLink, Check, DangerZone, Field, Flash, Panel, Select, Text } from '@/components/admin/ui';
import { PhotoInput } from '@/components/admin/PhotoInput';
import { addDays, fmtDate, roomsLeft, todayIST } from '@/lib/booking';
import { deleteStay, saveStay } from '../../../actions';
import type { Stay } from '@/lib/types';

const BLANK: Stay = { id: '', destSlug: '', name: '', type: 'Homestay', pricePerNight: 2000, rooms: 3, maxGuestsPerRoom: 2, amenities: [], about: '', published: true };

export default async function EditStay({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { id } = await params;
  const { ok, err } = await searchParams;
  const db = readDb();
  const isNew = id === 'new';
  const s = isNew ? BLANK : db.stays.find((x) => x.id === id);
  if (!s) notFound();
  const today = todayIST();
  const next30 = Array.from({ length: 30 }, (_, i) => addDays(today, i));

  return (
    <>
      <BackLink href="/admin/stays" label="All stays" />
      <AdminHeader title={isNew ? 'New stay' : s.name} action={!isNew ? <Link href={`/book/stay/${s.id}`} target="_blank" className="btn-secondary !py-2 !text-[15px]">View booking page ↗</Link> : undefined} />
      <Flash ok={ok} err={err} />
      <form action={saveStay} className="space-y-6">
        <input type="hidden" name="originalId" value={isNew ? '' : s.id} />
        <Panel title="Property">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Name"><Text name="name" defaultValue={s.name} required /></Field>
            <Field label="Place">
              <Select name="destSlug" defaultValue={s.destSlug} required>
                <option value="">Choose…</option>
                {db.destinations.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="Type"><Text name="type" defaultValue={s.type} placeholder="Homestay, Camp, Cottage…" /></Field>
            <Field label="Price per room per night (₹)"><Text type="number" name="pricePerNight" min={0} step={100} defaultValue={s.pricePerNight} /></Field>
            <Field label="Number of rooms / tents"><Text type="number" name="rooms" min={1} defaultValue={s.rooms} /></Field>
            <Field label="Max guests per room"><Text type="number" name="maxGuestsPerRoom" min={1} defaultValue={s.maxGuestsPerRoom} /></Field>
          </div>
          <Field label="About"><Area name="about" rows={3} defaultValue={s.about} /></Field>
          <Field label="Amenities (one per line)"><Area name="amenities" rows={4} defaultValue={s.amenities.join('\n')} /></Field>
          <Check name="published" label="Bookable (visible on the site)" defaultChecked={s.published} />
        </Panel>
        <Panel title="Photo"><PhotoInput current={s.image} /></Panel>
        <button className="btn">{isNew ? 'Create stay' : 'Save stay'}</button>
      </form>

      {!isNew && (
        <>
          <section className="card mt-6 p-6">
            <h2 className="text-lg font-semibold">Next 30 nights</h2>
            <p className="text-sm text-mute">Rooms free each night.</p>
            <div className="mt-4 grid grid-cols-6 gap-1.5 sm:grid-cols-10">
              {next30.map((d) => {
                const free = roomsLeft(s, d, addDays(d, 1), db.bookings);
                return (
                  <div key={d} className={`rounded-lg p-1.5 text-center text-xs ${free === 0 ? 'bg-[#fff0ed] text-[#b3261e]' : free < s.rooms ? 'bg-[#fff4e5] text-eyebrow' : 'bg-[#e9f7ee] text-good'}`}>
                    <span className="block text-[10px] opacity-70">{fmtDate(d)}</span>{free}/{s.rooms}
                  </div>
                );
              })}
            </div>
          </section>
          <section className="card mb-10 mt-6 border border-[#ffd2cc] p-6">
            <h2 className="mb-4 text-lg font-semibold">Delete stay</h2>
            <DangerZone action={deleteStay} hidden={{ id: s.id }} what="this stay" />
          </section>
        </>
      )}
    </>
  );
}
