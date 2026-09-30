import type { Spot } from '@/lib/types';

const ICON: Record<string, string> = {
  Waterfall: '💧', Lake: '🏞️', Viewpoint: '🔭', Peak: '⛰️', Glacier: '🧊', 'Hot spring': '♨️', Cave: '🕳️', Beach: '🏖️',
  Fort: '🏰', 'Palace / fort': '🏰', Ruins: '🏛️', 'Archaeological site': '🏛️', Monument: '🗿', Museum: '🖼️',
  'Nature reserve': '🌳', 'National park': '🌳', 'Hiking area': '🥾', Park: '🌳', 'Temple / shrine': '🛕',
};
const icon = (k: string) => ICON[k] ?? (/temple|monaster|gompa|church|mosque|shrine/i.test(k) ? '🛕' : /trek|hik|trail/i.test(k) ? '🥾' : '📍');

export function SpotCard({ s, place }: { s: Spot; place?: { name: string; href: string } }) {
  return (
    <a href={s.mapsUrl} target="_blank" rel="noreferrer" className="card card-hover flex gap-4 p-5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-paper text-xl" aria-hidden>{icon(s.kind)}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span className="line-clamp-2 text-[17px] font-semibold leading-snug">{s.name}</span>
          {s.gem && <span className="pill shrink-0 !py-0.5 !text-[11px]">hidden gem</span>}
        </span>
        <span className="mt-1 block text-sm text-mute">
          {s.kind} · {s.distKm < 1 ? 'in town' : `${s.distKm} km away`}
          {place ? <> · near {place.name}</> : null}
        </span>
        {s.rating ? (
          <span className="mt-1.5 block text-sm"><span className="text-[#f5a623]">★</span> <b>{s.rating.toFixed(1)}</b> <span className="text-faint">· {s.reviews?.toLocaleString('en-IN')} reviews</span></span>
        ) : null}
        <span className="link-out mt-2 block text-sm text-blue-link">Open in Maps</span>
      </span>
    </a>
  );
}

export function SpotAttribution({ spots }: { spots: Spot[] }) {
  const g = spots.some((s) => s.src === 'google'), o = spots.some((s) => s.src === 'osm');
  return (
    <p className="mt-4 text-xs text-faint">
      {g && 'Ratings and places from Google Maps. '}
      {o && <>Places from <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>. </>}
      Distances are straight-line from the town; check the road on Maps before you go.
    </p>
  );
}
