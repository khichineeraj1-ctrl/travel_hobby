import Link from 'next/link';
import type { RoadTrip } from '@/lib/types';
import { project, totals } from '@/lib/roadtrips';
import { monthShort } from '@/lib/months';

/** Self-contained SVG route map — no map tiles, no API keys. */
export function RouteMap({ t, className = '', labels = true, dark = false }: { t: RoadTrip; className?: string; labels?: boolean; dark?: boolean }) {
  const W = 600, H = 360;
  const pts = project(t, W, H, labels ? 60 : 30);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const ink = dark ? '#ffffff' : '#1d1d1f';
  const seen = new Set<string>();
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={`Route: ${t.stops.map((s) => s.name).join(' to ')}`}>
      <defs>
        <pattern id={`g-${t.slug}`} width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'} />
        </pattern>
      </defs>
      <rect width={W} height={H} fill={`url(#g-${t.slug})`} />
      <path d={path} fill="none" stroke={dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,113,227,0.18)'} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d={path} fill="none" stroke={dark ? '#ffffff' : '#0071e3'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 7" />
      {pts.map((p, i) => {
        const key = `${p.x.toFixed(0)}-${p.y.toFixed(0)}`;
        const dup = seen.has(key); seen.add(key);
        const end = i === 0 || i === pts.length - 1;
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={end ? 7 : p.nights ? 5.5 : 3.5} fill={end ? (dark ? '#fff' : '#1d1d1f') : dark ? '#ffb703' : '#fff'} stroke={dark ? '#fff' : '#0071e3'} strokeWidth="2.5" />
            {labels && !dup && (
              <text x={p.x + 10} y={p.y - 10} fontSize="15" fontWeight="600" fill={ink} fontFamily="-apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif">
                {p.name}{p.nights ? ` · ${p.nights}n` : ''}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export const DIFF = { easy: 'Easy drive', moderate: 'Moderate', hardcore: 'Hardcore' } as const;

export function RoadTripCard({ t, rail = false }: { t: RoadTrip; rail?: boolean }) {
  const x = totals(t);
  const [a, b] = t.palette;
  return (
    <Link
      href={`/road-trips/${t.slug}`}
      className={`card card-hover group flex flex-col overflow-hidden ${rail ? 'w-[300px] shrink-0 snap-start sm:w-[380px]' : ''}`}
    >
      <div className="relative aspect-[16/10]" style={{ background: `linear-gradient(160deg, ${a}, ${b})` }}>
        {t.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.image} alt={t.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        ) : (
          <RouteMap t={t} labels={false} dark className="absolute inset-0 h-full w-full" />
        )}
        <span className="absolute left-4 top-4 rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">{x.days} days · {x.km.toLocaleString('en-IN')} km</span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-faint">{DIFF[t.difficulty]} · {t.vehicle}</p>
        <h3 className="mt-1 text-xl font-semibold tracking-headline group-hover:text-blue-link">{t.title}</h3>
        <p className="mt-1.5 text-[15px] text-mute">{t.hook}</p>
        <p className="mt-auto pt-4 text-sm text-mute">Best {t.bestMonths.map((m) => monthShort(m)).join(', ')}</p>
      </div>
    </Link>
  );
}
