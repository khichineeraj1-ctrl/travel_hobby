import Link from 'next/link';
import { readDb } from '@/lib/db';
import { AdminHeader, Badge, Flash } from '@/components/admin/ui';
import { fmtRange, seatsLeft, todayIST } from '@/lib/booking';
import { inr } from '@/lib/format';

export default async function Trips({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { ok, err } = await searchParams;
  const db = readDb();
  const today = todayIST();
  const items = [...db.departures].sort((a, b) => a.startDate.localeCompare(b.startDate));
  return (
    <>
      <AdminHeader title="Group trips" sub="Fixed-date departures with limited seats." action={<Link href="/admin/trips/new" className="btn">Add a trip</Link>} />
      <Flash ok={ok} err={err} />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-[15px]">
          <thead className="border-b border-line text-xs font-semibold uppercase tracking-wide text-faint">
            <tr><th className="px-5 py-3">Trip</th><th className="px-5 py-3">Dates</th><th className="px-5 py-3">Price</th><th className="px-5 py-3">Seats</th><th className="px-5 py-3">Status</th></tr>
          </thead>
          <tbody>
            {items.map((d) => {
              const left = seatsLeft(d, db.bookings);
              const past = d.startDate <= today;
              return (
                <tr key={d.id} className="border-b border-line/60 last:border-0 hover:bg-paper/60">
                  <td className="px-5 py-3"><Link href={`/admin/trips/${d.id}`} className="text-blue-link hover:underline">{d.title}</Link><span className="block text-xs text-faint">{db.destinations.find((x) => x.slug === d.destSlug)?.name}</span></td>
                  <td className="whitespace-nowrap px-5 py-3 text-sm">{fmtRange(d.startDate, d.endDate)}</td>
                  <td className="px-5 py-3">{inr(d.pricePerPerson)}</td>
                  <td className="px-5 py-3">
                    <span className="text-sm">{d.seatsTotal - left}/{d.seatsTotal}</span>
                    <span className="mt-1 block h-1.5 w-24 overflow-hidden rounded-full bg-paper"><span className="block h-full bg-blue" style={{ width: `${((d.seatsTotal - left) / d.seatsTotal) * 100}%` }} /></span>
                  </td>
                  <td className="px-5 py-3">{past ? <Badge tone="gray">Past</Badge> : !d.published ? <Badge tone="gray">Draft</Badge> : left === 0 ? <Badge tone="orange">Sold out</Badge> : <Badge tone="green">On sale</Badge>}</td>
                </tr>
              );
            })}
            {items.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-mute">No trips yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
