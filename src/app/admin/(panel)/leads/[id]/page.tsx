import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readDb } from '@/lib/db';
import { AdminHeader, Area, BackLink, Badge, ContactActions, Field, Flash, Panel, STATUS_TONE } from '@/components/admin/ui';
import { LEAD_LABEL } from '@/lib/booking';
import { updateLead } from '../../../actions';

const LABEL: Record<string, string> = {
  place: 'Where', when: 'When', days: 'Days', groupSize: 'Group size', crew: 'Crew', budget: 'Budget', from: 'From', message: 'Message',
  business: 'Business', partnerType: 'Type', location: 'Location', capacity: 'Capacity', link: 'Link',
  item: 'Item id', eventSlug: 'Event id', eventName: 'Event', eventDates: 'Event dates', wants: 'Wants', itemName: 'Was booking', dates: 'Dates', guests: 'Guests', channel: 'Channel',
};

export default async function LeadDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { id } = await params;
  const { ok, err } = await searchParams;
  const l = readDb().leads.find((x) => x.id === id);
  if (!l) notFound();
  const first = (l.name ?? '').split(' ')[0] || 'there';
  const msg = l.kind === 'dropoff'
    ? `Hi ${first}! Saw you were checking out ${l.data.itemName ?? 'a trip'} on bhatko — can I help you finish the booking or answer anything?`
    : l.kind === 'event' ? `Hi${l.name ? ' ' + first : ''}! You asked about ${l.data.eventName ?? 'an event'} on bhatko. `
    : l.kind === 'partner' ? `Hi ${first}, thanks for applying to list ${l.data.business ?? 'your place'} on bhatko! `
    : `Hi ${first}! Thanks for reaching out to bhatko${l.data.place ? ` about ${l.data.place}` : ''}. `;

  return (
    <>
      <BackLink href="/admin/leads" label="All leads" />
      <AdminHeader title={l.name || l.email || l.phone || l.id} sub={`${LEAD_LABEL[l.kind]} · ${new Date(l.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`} action={<Badge tone={STATUS_TONE[l.status]}>{l.status}</Badge>} />
      <Flash ok={ok} err={err} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Panel title="Details">
            <dl className="divide-y divide-line/70">
              {Object.entries(l.data).map(([k, v]) => (
                <div key={k} className="grid gap-1 py-2.5 sm:grid-cols-[160px_1fr]"><dt className="text-sm text-mute">{LABEL[k] ?? k}</dt><dd className="whitespace-pre-wrap text-[15px]">{v}</dd></div>
              ))}
              {l.source && <div className="grid gap-1 py-2.5 sm:grid-cols-[160px_1fr]"><dt className="text-sm text-mute">Came from</dt><dd className="text-[15px]">{l.source}</dd></div>}
              {l.bookingId && <div className="grid gap-1 py-2.5 sm:grid-cols-[160px_1fr]"><dt className="text-sm text-mute">Converted to</dt><dd><Link href={`/admin/bookings/${l.bookingId}`} className="font-mono text-blue-link">{l.bookingId}</Link></dd></div>}
            </dl>
          </Panel>
          <Panel title="Update">
            <form action={updateLead} className="space-y-5">
              <input type="hidden" name="id" value={l.id} />
              <div className="flex flex-wrap gap-2">
                {(['new', 'contacted', 'converted', 'closed'] as const).map((s) => (
                  <label key={s} className="cursor-pointer">
                    <input type="radio" name="status" value={s} defaultChecked={l.status === s} className="peer sr-only" />
                    <span className="chip capitalize peer-checked:border-blue peer-checked:bg-blue-soft peer-checked:ring-1 peer-checked:ring-blue">{s}</span>
                  </label>
                ))}
              </div>
              <Field label="Internal notes"><Area name="adminNotes" rows={3} defaultValue={l.adminNotes} /></Field>
              <button className="btn btn-sm">Save</button>
            </form>
          </Panel>
        </div>
        <Panel title="Contact">
          <p className="text-[15px] text-mute">{l.phone}{l.email ? <><br />{l.email}</> : null}</p>
          <ContactActions phone={l.phone} email={l.email} message={msg} />
        </Panel>
      </div>
    </>
  );
}
