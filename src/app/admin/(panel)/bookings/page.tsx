import Link from 'next/link';
import { readDb } from '@/lib/db';
import { AdminHeader, Badge, Flash, STATUS_TONE, ago } from '@/components/admin/ui';
import { fmtRange, KIND_LABEL, STATUS_LABEL } from '@/lib/booking';
import { inr } from '@/lib/format';

export default async function Bookings({ searchParams }: { searchParams: Promise<{ status?: string; kind?: string; q?: string; ok?: string; err?: string }> }) {
  const { status = 'open', kind = 'all', q = '', ok, err } = await searchParams;
  const db = readDb();
  const needle = q.toLowerCase();
  const items = db.bookings
    .filter((b) => status === 'all' || (status === 'open' ? b.status === 'pending' || b.status === 'confirmed' : b.status === status))
    .filter((b) => kind === 'all' || b.kind === kind)
    .filter((b) => !needle || `${b.id} ${b.contact.name} ${b.contact.phone} ${b.contact.email ?? ''}`.toLowerCase().includes(needle));
  const what = (b: (typeof items)[number]) =>
    b.departureId ? db.departures.find((d) => d.id === b.departureId)?.title
    : b.stayId ? db.stays.find((s) => s.id === b.stayId)?.name
    : `Custom · ${db.destinations.find((d) => d.slug === b.destSlug)?.name ?? b.details.gem ?? b.details.placeText ?? 'anywhere'}`;
  const count = (s: string) => db.bookings.filter((b) => b.status === s).length;

  return (
    <>
      <AdminHeader
        title="Bookings"
        sub={`${count('pending')} pending · ${count('confirmed')} confirmed · ${count('paid')} paid`}
        action={<a href="/admin/export/bookings" className="btn-secondary !py-2 !text-[15px]">Export CSV</a>}
      />
      <Flash ok={ok} err={err} />
      <form className="mb-5 flex flex-wrap gap-3">
        <input name="q" defaultValue={q} placeholder="Ref, name, phone or email" className="field max-w-xs" />
        <select name="status" defaultValue={status} className="field w-auto">
          <option value="open">Open (pending + confirmed)</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option>
          <option value="paid">Paid</option><option value="cancelled">Cancelled</option><option value="all">All</option>
        </select>
        <select name="kind" defaultValue={kind} className="field w-auto">
          <option value="all">All types</option><option value="trip">Group trips</option><option value="stay">Stays</option><option value="custom">Custom trips</option>
        </select>
        <button className="btn-secondary !py-2 !text-[15px]">Filter</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[15px]">
          <thead className="border-b border-line text-xs font-semibold uppercase tracking-wide text-faint">
            <tr><th className="px-5 py-3">Ref</th><th className="px-5 py-3">Traveller</th><th className="px-5 py-3">What</th><th className="px-5 py-3">Dates</th><th className="px-5 py-3">Pax</th><th className="px-5 py-3">Total</th><th className="px-5 py-3">Status</th></tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id} className="border-b border-line/60 last:border-0 hover:bg-paper/60">
                <td className="px-5 py-3"><Link href={`/admin/bookings/${b.id}`} className="font-mono text-sm text-blue-link hover:underline">{b.id}</Link><span className="block text-xs text-faint">{ago(b.createdAt)}</span></td>
                <td className="px-5 py-3">{b.contact.name}<span className="block text-xs text-faint">{b.contact.phone}</span></td>
                <td className="px-5 py-3">{what(b)}<span className="block text-xs text-faint">{KIND_LABEL[b.kind]}</span></td>
                <td className="whitespace-nowrap px-5 py-3 text-sm">{b.checkIn && b.checkOut ? fmtRange(b.checkIn, b.checkOut) : b.details.flexibleWhen ?? '—'}</td>
                <td className="px-5 py-3">{b.guests}</td>
                <td className="whitespace-nowrap px-5 py-3">{b.total ? inr(b.total) : '—'}</td>
                <td className="px-5 py-3"><Badge tone={STATUS_TONE[b.status]}>{STATUS_LABEL[b.status]}</Badge></td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-mute">No bookings here yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
