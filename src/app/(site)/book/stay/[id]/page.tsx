import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { readDb } from '@/lib/db';
import { todayIST } from '@/lib/booking';
import { BookShell, TrustCard } from '@/components/BookShell';
import { Checkout } from '@/components/Checkout';
import { PlaceArt } from '@/components/PlaceCard';
import { inr } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Book your stay', robots: { index: false } };

export default async function BookStay({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = readDb();
  const s = db.stays.find((x) => x.id === id && x.published);
  if (!s) notFound();
  const place = db.destinations.find((x) => x.slug === s.destSlug);

  return (
    <BookShell
      crumbs={[{ name: place?.name ?? 'Stays', path: place ? `/places/${place.slug}` : '/places' }, { name: s.name, path: `/book/stay/${s.id}` }]}
      title={`${s.name}.`}
      sub={`${s.type} · ${place?.name ?? ''}`}
      aside={
        <>
          <div className="card overflow-hidden">
            {s.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.image} alt={s.name} className="aspect-[16/9] w-full object-cover" />
            ) : place ? <PlaceArt d={place} className="aspect-[16/9]" /> : null}
            <div className="p-6">
              <p className="text-2xl font-semibold">{inr(s.pricePerNight)} <span className="text-sm font-normal text-mute">/ room / night</span></p>
              <p className="mt-2 text-sm text-mute">{s.about}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">{s.amenities.map((a) => <span key={a} className="pill">{a}</span>)}</div>
              {place && <Link href={`/places/${place.slug}`} className="link-arrow mt-4 text-sm">About {place.name}</Link>}
            </div>
          </div>
          <TrustCard />
        </>
      }
    >
      <Checkout kind="stay" id={s.id} title={s.name} pricePerNight={s.pricePerNight} maxGuestsPerRoom={s.maxGuestsPerRoom} totalRooms={s.rooms} today={todayIST()} source={`/book/stay/${s.id}`} />
    </BookShell>
  );
}
