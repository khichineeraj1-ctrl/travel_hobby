import Link from 'next/link';
import { readDb } from '@/lib/db';
import { AdminHeader, Badge, Flash } from '@/components/admin/ui';
import { inr } from '@/lib/format';
import { todayIST } from '@/lib/booking';

export default async function Stays({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { ok, err } = await searchParams;
  const db = readDb();
  const today = todayIST();
  return (
    <>
      <AdminHeader title="Stays" sub="Partner homestays, camps and cottages bookable by the night." action={<Link href="/admin/stays/new" className="btn">Add a stay</Link>} />
      <Flash ok={ok} err={err} />
      <div className="grid gap-4 sm:grid-cols-2">
        {db.stays.map((s) => {
          const upcoming = db.bookings.filter((b) => b.stayId === s.id && b.status !== 'cancelled' && (b.checkOut ?? '') >= today).length;
          return (
            <Link key={s.id} href={`/admin/stays/${s.id}`} className="card card-hover flex gap-4 p-5">
              <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-paper">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {s.image ? <img src={s.image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-2xl">🏡</div>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{s.name}</p>
                <p className="text-sm text-mute">{db.destinations.find((d) => d.slug === s.destSlug)?.name} · {s.type}</p>
                <p className="mt-1 text-sm">{inr(s.pricePerNight)}/night · {s.rooms} rooms · {upcoming} upcoming</p>
              </div>
              {s.published ? <Badge tone="green">Live</Badge> : <Badge tone="gray">Draft</Badge>}
            </Link>
          );
        })}
      </div>
      {db.stays.length === 0 && <p className="card p-10 text-center text-mute">No stays yet.</p>}
    </>
  );
}
