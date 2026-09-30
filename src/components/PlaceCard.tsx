import Link from 'next/link';
import type { Destination } from '@/lib/types';
import { crowdLabel, inr, signalLabel } from '@/lib/format';
import { monthShort } from '@/lib/months';

/** Photo if uploaded, otherwise a soft gradient landscape. */
export function PlaceArt({ d, className = '', priority = false }: { d: Destination; className?: string; priority?: boolean }) {
  const [a, b] = d.palette;
  const pos = /\babsolute\b/.test(className) ? '' : 'relative';
  if (d.image) {
    return (
      <div className={`${pos} overflow-hidden bg-paper ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={d.image} alt={`${d.name}, ${d.state}`} className="h-full w-full object-cover" loading={priority ? 'eager' : 'lazy'} />
      </div>
    );
  }
  return (
    <div
      className={`${pos} overflow-hidden ${className}`}
      style={{ background: `radial-gradient(120% 90% at 25% 0%, ${b} 0%, transparent 60%), linear-gradient(170deg, ${a}, ${a}cc 55%, ${b}aa)` }}
      role="img"
      aria-label={`${d.name}, ${d.state}`}
    >
      <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="absolute bottom-0 h-1/2 w-full">
        {d.terrain === 'coast' || d.terrain === 'island' ? (
          <path d="M0 70 Q50 55 100 70 T200 70 T300 70 T400 70 V120 H0Z" fill="rgba(0,0,0,0.18)" />
        ) : d.terrain === 'plains' || d.terrain === 'desert' ? (
          <path d="M0 90 L60 60 L90 60 L90 40 L120 40 L120 60 L200 60 L260 80 L400 75 V120 H0Z" fill="rgba(0,0,0,0.18)" />
        ) : (
          <>
            <path d="M0 110 L70 40 L120 80 L190 15 L260 85 L320 45 L400 100 V120 H0Z" fill="rgba(0,0,0,0.14)" />
            <path d="M0 120 L90 70 L150 100 L230 55 L310 95 L400 70 V120Z" fill="rgba(0,0,0,0.14)" />
          </>
        )}
      </svg>
    </div>
  );
}

export function PlaceCard({ d, from, extra }: { d: Destination; from?: string; extra?: React.ReactNode }) {
  const href = `/places/${d.slug}${from ? `?from=${from}` : ''}`;
  return (
    <Link href={href} className="card card-hover group flex flex-col overflow-hidden">
      <PlaceArt d={d} className="aspect-[16/10]" />
      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-faint">{d.state}</p>
        <h3 className="mt-1 text-2xl font-semibold tracking-headline">{d.name}</h3>
        <p className="mt-1.5 text-[15px] leading-snug text-mute">{d.hook}</p>
        {extra}
        <div className="mt-auto flex flex-wrap gap-1.5 pt-5">
          <span className="pill">{crowdLabel(d.crowd)}</span>
          <span className="pill">{signalLabel[d.signal]}</span>
          <span className="pill">from {inr(d.budgetPerDay[0])}/day</span>
          <span className="pill">best {d.bestMonths.slice(0, 3).map((m) => monthShort(m)).join(', ')}{d.bestMonths.length > 3 ? '…' : ''}</span>
        </div>
      </div>
    </Link>
  );
}

export function PlaceGrid({ items, from }: { items: Destination[]; from?: string }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((d) => <PlaceCard key={d.slug} d={d} from={from} />)}
    </div>
  );
}

/** Big Apple-store-style rail tile: eyebrow, title, one-liner, image fills the card. */
export function Tile({ d, eyebrow }: { d: Destination; eyebrow: string }) {
  return (
    <Link
      href={`/places/${d.slug}`}
      className="card-hover group relative block h-[500px] w-[300px] shrink-0 snap-start overflow-hidden rounded-apple bg-black shadow-tile sm:w-[400px]"
    >
      <PlaceArt d={d} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-black/70 via-black/30 to-transparent" />
      <div className="relative p-8 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#ff9f5a]">{eyebrow}</p>
        <h3 className="mt-2 text-[28px] font-semibold leading-tight tracking-headline">{d.name}</h3>
        <p className="mt-2 text-[17px] leading-snug text-white/85">{d.hook}</p>
        <p className="mt-3 text-sm text-white/70">{d.state}</p>
      </div>
    </Link>
  );
}
