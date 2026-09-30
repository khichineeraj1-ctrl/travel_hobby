import Link from 'next/link';
import { readDb } from '@/lib/db';
import { AdminHeader, Badge, Flash } from '@/components/admin/ui';
import { RouteMap } from '@/components/RoadTrip';
import { totals } from '@/lib/roadtrips';

export default async function RoadTrips({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { ok, err } = await searchParams;
  const trips = readDb().roadTrips;
  return (
    <>
      <AdminHeader title="Road trips" sub="Multi-stop routes with drive times, permits and fuel notes." action={<Link href="/admin/roadtrips/new" className="btn">Add a road trip</Link>} />
      <Flash ok={ok} err={err} />
      <div className="grid gap-4 sm:grid-cols-2">
        {trips.map((t) => {
          const x = totals(t);
          return (
            <Link key={t.slug} href={`/admin/roadtrips/${t.slug}`} className="card card-hover flex gap-4 p-4">
              <div className="h-24 w-36 shrink-0 overflow-hidden rounded-xl" style={{ background: `linear-gradient(160deg, ${t.palette[0]}, ${t.palette[1]})` }}>
                <RouteMap t={t} labels={false} dark className="h-full w-full" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{t.title}</p>
                <p className="text-sm text-mute">{x.days} days · {x.km.toLocaleString('en-IN')} km · {t.stops.length} stops</p>
                <div className="mt-2">{t.published ? <Badge tone="green">Live</Badge> : <Badge tone="gray">Draft</Badge>}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
