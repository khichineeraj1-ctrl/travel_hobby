import Link from 'next/link';
import { readDb } from '@/lib/db';
import { AdminHeader, Badge, Flash } from '@/components/admin/ui';
import { spotProvider, spotsDueCount } from '@/lib/places';
import { refreshNearbySpots, toggleSpot } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function Spots({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { ok, err } = await searchParams;
  const db = readDb();
  const prov = spotProvider();
  const due = spotsDueCount();
  const hidden = new Set(db.hiddenSpots ?? []);
  const places = db.destinations.filter((d) => d.published !== false).sort((a, b) => a.name.localeCompare(b.name));
  const total = places.reduce((n, d) => n + (db.spots?.[d.slug]?.spots.length ?? 0), 0);
  const meta = db.spotMeta;
  return (
    <>
      <AdminHeader
        title="Nearby spots"
        sub={prov === 'google'
          ? 'Top-rated viewpoints, waterfalls, treks and sights around each place, from Google Maps. Filtered by the rating rules in Site content.'
          : prov === 'osm'
            ? 'Named viewpoints, waterfalls, lakes, forts and peaks from OpenStreetMap. Add GOOGLE_MAPS_API_KEY in Railway to rank by Google ratings instead.'
            : 'Spot discovery is off (PLACES_PROVIDER=off).'}
        action={prov !== 'off' ? <form action={refreshNearbySpots}><button className="btn">{due ? `Fetch ${due} due` : 'Check for updates'}</button></form> : undefined}
      />
      <Flash ok={ok} err={err} />
      <p className="mb-6 text-sm text-mute">
        {total} spots across {places.length} places · source: <b className="text-ink">{prov === 'google' ? 'Google Maps' : prov === 'osm' ? 'OpenStreetMap' : 'off'}</b>
        {meta?.lastRun ? ` · last run ${new Date(meta.lastRun).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
        {meta?.lastError ? ` · last error: ${meta.lastError}` : ''}. Refreshes on start-up, daily for anything older than 25 days, and when you save a place. Hide anything that isn’t worth the detour.
      </p>
      <div className="space-y-4">
        {places.map((d) => {
          const set = db.spots?.[d.slug];
          return (
            <details key={d.slug} className="card group p-5">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
                <span className="font-semibold">{d.name}</span>
                <span className="text-sm text-mute">{d.state}</span>
                <span className="ml-auto flex items-center gap-2">
                  {set?.error && <Badge tone="orange">error</Badge>}
                  <Badge tone={set?.spots.length ? 'green' : 'gray'}>{set ? `${set.spots.length} spots · ${set.src}` : 'not fetched'}</Badge>
                </span>
              </summary>
              <div className="mt-4">
                {set?.error && <p className="mb-3 text-sm text-eyebrow">{set.error}</p>}
                <ul className="divide-y divide-line/70">
                  {(set?.spots ?? []).map((s) => (
                    <li key={s.id} className={`flex items-center gap-3 py-2 text-[15px] ${hidden.has(s.id) ? 'opacity-40' : ''}`}>
                      <a href={s.mapsUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate hover:text-blue-link">{s.name}</a>
                      <span className="hidden text-sm text-mute sm:inline">{s.kind}</span>
                      {s.rating ? <span className="text-sm">★ {s.rating.toFixed(1)} <span className="text-faint">({s.reviews?.toLocaleString('en-IN')})</span></span> : null}
                      <span className="w-16 text-right text-sm text-mute">{s.distKm} km</span>
                      <form action={toggleSpot}><input type="hidden" name="id" value={s.id} /><button className="text-sm text-blue-link hover:underline">{hidden.has(s.id) ? 'Show' : 'Hide'}</button></form>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-4 text-sm">
                  {prov !== 'off' && <form action={refreshNearbySpots}><input type="hidden" name="slug" value={d.slug} /><button className="text-blue-link hover:underline">Re-fetch this place</button></form>}
                  <Link href={`/places/${d.slug}#spots`} target="_blank" className="text-blue-link hover:underline">View on site</Link>
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </>
  );
}
