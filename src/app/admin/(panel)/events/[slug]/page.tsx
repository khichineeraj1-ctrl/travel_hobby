import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readDb } from '@/lib/db';
import { AdminHeader, Area, BackLink, ContactActions, DangerZone, Field, Flash, Panel, Select, Text } from '@/components/admin/ui';
import { PhotoInput } from '@/components/admin/PhotoInput';
import { deleteEvent, saveEvent } from '../../../actions';
import { CATEGORY_LABEL, fmtEventDates, phase } from '@/lib/events';
import { SITE_URL } from '@/lib/seo';
import type { TravelEvent } from '@/lib/types';

const BLANK: TravelEvent = {
  slug: '', name: '', category: 'festival', startDate: '', endDate: '', dateStatus: 'expected', town: '', state: '', lat: 0, lng: 0,
  hook: '', about: '', tips: [], recurring: 'annual', status: 'draft',
};

export default async function EditEvent({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { slug } = await params;
  const { ok, err } = await searchParams;
  const db = readDb();
  const isNew = slug === 'new';
  const e = isNew ? BLANK : db.events.find((x) => x.slug === slug);
  if (!e) notFound();
  const waiting = isNew ? [] : db.leads.filter((l) => l.kind === 'event' && l.data.eventSlug === e.slug && l.status !== 'closed');
  const p = isNew ? 'upcoming' : phase(e);
  const url = `${SITE_URL}/events/${e.slug}`;
  const msg = (name?: string) =>
    p === 'past'
      ? `Hi${name ? ' ' + name.split(' ')[0] : ''}! You asked us to ping you about ${e.name}. We'll share next year's dates as soon as they're out. Meanwhile: ${url}`
      : `Hi${name ? ' ' + name.split(' ')[0] : ''}! ${e.name} is on ${fmtEventDates(e)} in ${e.town}. Stays are filling up — want us to plan it for you? ${url}`;

  return (
    <>
      <BackLink href="/admin/events" label="All events" />
      <AdminHeader
        title={isNew ? 'New event' : e.name}
        sub={isNew ? 'Name, dates and a location are enough to start. Save as draft, publish when ready.' : `/events/${e.slug} · ${e.status}`}
        action={!isNew && e.status === 'published' ? <Link href={`/events/${e.slug}`} target="_blank" className="btn-secondary !py-2 !text-[15px]">View live ↗</Link> : undefined}
      />
      <Flash ok={ok} err={err} />

      {waiting.length > 0 && (
        <section className="card mb-6 p-6">
          <h2 className="text-lg font-semibold">{waiting.length} {waiting.length === 1 ? 'person is' : 'people are'} waiting for alerts</h2>
          <p className="text-sm text-mute">One tap sends a pre-written WhatsApp. Mark them contacted in Leads afterwards.</p>
          <ul className="mt-4 divide-y divide-line/70">
            {waiting.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="text-[15px]">{l.name ?? l.phone ?? l.email}<span className="block text-xs text-faint">{l.data.wants ?? ''}{l.data.from ? ` · from ${l.data.from}` : ''}</span></span>
                <ContactActions phone={l.phone} email={l.email} message={msg(l.name)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <form action={saveEvent} className="space-y-6">
        <input type="hidden" name="originalSlug" value={isNew ? '' : e.slug} />
        <Panel title="Event">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Name"><Text name="name" defaultValue={e.name} required /></Field>
            <Field label="Category">
              <Select name="category" defaultValue={e.category}>{Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
            </Field>
            <Field label="Start date"><Text type="date" name="startDate" defaultValue={e.startDate} required /></Field>
            <Field label="End date"><Text type="date" name="endDate" defaultValue={e.endDate} /></Field>
            <Field label="Dates are…">
              <Select name="dateStatus" defaultValue={e.dateStatus}><option value="confirmed">Confirmed (announced)</option><option value="expected">Expected (usual pattern)</option></Select>
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue={e.status}><option value="published">Published</option><option value="draft">Draft</option><option value="suggested">Suggested (needs review)</option></Select>
            </Field>
          </div>
          <Field label="Hook" hint="One line that makes someone want to go."><Text name="hook" defaultValue={e.hook} maxLength={160} /></Field>
          <Field label="About"><Area name="about" rows={4} defaultValue={e.about} /></Field>
          <Field label="Tips (one per line)"><Area name="tips" rows={4} defaultValue={e.tips.join('\n')} /></Field>
        </Panel>

        <Panel title="Where" sub="Coordinates power ‘near this place’, the planner boost and travel times.">
          <div className="grid gap-5 sm:grid-cols-4">
            <Field label="Town / venue" className="sm:col-span-2"><Text name="town" defaultValue={e.town} /></Field>
            <Field label="State" className="sm:col-span-2"><Text name="state" defaultValue={e.state} /></Field>
            <Field label="Latitude"><Text type="number" step="any" name="lat" defaultValue={e.lat || ''} required /></Field>
            <Field label="Longitude"><Text type="number" step="any" name="lng" defaultValue={e.lng || ''} required /></Field>
            <Field label="Linked place" className="sm:col-span-2">
              <Select name="destSlug" defaultValue={e.destSlug ?? ''}><option value="">None</option>{db.destinations.map((d) => <option key={d.slug} value={d.slug}>{d.name}</option>)}</Select>
            </Field>
            <Field label="Linked road trip" className="sm:col-span-2">
              <Select name="roadTripSlug" defaultValue={e.roadTripSlug ?? ''}><option value="">None</option>{db.roadTrips.map((t) => <option key={t.slug} value={t.slug}>{t.title}</option>)}</Select>
            </Field>
          </div>
        </Panel>

        <Panel title="Recurrence & links">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Recurring">
              <Select name="recurring" defaultValue={e.recurring}><option value="annual">Annual</option><option value="one-off">One-off</option></Select>
            </Field>
            <Field label="Next edition hint" hint="Shown after it ends, e.g. “Usually mid-September”"><Text name="nextEdition" defaultValue={e.nextEdition} /></Field>
            <Field label="Source URL" hint="Where the dates came from"><Text type="url" name="sourceUrl" defaultValue={e.sourceUrl} /></Field>
            <Field label="Tickets URL"><Text type="url" name="ticketUrl" defaultValue={e.ticketUrl} /></Field>
            <Field label="Road slowness override (optional)" hint="For remote venues: 2.2–3 makes travel times realistic (Zanskar ≈ 2.8)."><Text type="number" step="0.1" min={1} max={3} name="roadFactor" defaultValue={e.roadFactor ?? ''} /></Field>
          </div>
        </Panel>

        <Panel title="Photo"><PhotoInput current={e.image} /></Panel>
        <button className="btn">{isNew ? 'Create event' : 'Save event'}</button>
      </form>

      {!isNew && (
        <section className="card mb-10 mt-6 border border-[#ffd2cc] p-6">
          <h2 className="mb-4 text-lg font-semibold">Delete event</h2>
          <DangerZone action={deleteEvent} hidden={{ slug: e.slug }} what="this event" />
        </section>
      )}
    </>
  );
}
