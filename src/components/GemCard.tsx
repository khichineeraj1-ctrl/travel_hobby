import Link from 'next/link';
import { monthShort } from '@/lib/months';
import type { Month } from '@/lib/types';

/** What a gem card needs — works for catalogue items, all-India gems and spots around our places. */
export type GemLike = {
  id: string;
  name: string;
  kind: string;
  family: string;
  stateName: string;
  area?: string;
  rating?: number;
  reviews?: number;
  gem?: boolean;
  months?: Month[];
  href: string;
};

/* each family gets its own sky + land palette, varied per place so a grid never looks copy-pasted */
const PALETTES: Record<string, [string, string][]> = {
  water: [['#0f4c75', '#3fc1c9'], ['#1b6ca8', '#8fd3f4'], ['#164e63', '#5eead4'], ['#1e3a8a', '#60a5fa']],
  views: [['#3b1f5c', '#f59e0b'], ['#1f2a44', '#fb923c'], ['#4c1d95', '#f472b6'], ['#0c4a6e', '#fbbf24']],
  wild: [['#14532d', '#a3e635'], ['#064e3b', '#6ee7b7'], ['#365314', '#bef264'], ['#134e4a', '#86efac']],
  heritage: [['#7c2d12', '#fdba74'], ['#78350f', '#fcd34d'], ['#7f1d1d', '#fca5a5'], ['#713f12', '#fde68a']],
  sacred: [['#7c2d12', '#fde047'], ['#831843', '#fda4af'], ['#9a3412', '#fed7aa'], ['#581c87', '#f0abfc']],
  other: [['#1f2937', '#94a3b8'], ['#334155', '#a5b4fc'], ['#3f3f46', '#d4d4d8'], ['#1e293b', '#7dd3fc']],
};

const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };

export const KIND_ICON = (k: string) =>
  /fall/i.test(k) ? '💧' : /lake/i.test(k) ? '🏞️' : /beach/i.test(k) ? '🏖️' : /view|peak|point/i.test(k) ? '🔭' : /glacier/i.test(k) ? '🧊'
    : /hot spring/i.test(k) ? '♨️' : /cave/i.test(k) ? '🕳️' : /fort|palace/i.test(k) ? '🏰' : /ruin|archae|monument|heritage/i.test(k) ? '🏛️'
      : /museum/i.test(k) ? '🖼️' : /temple|shrine|monaster|gompa|church|mosque/i.test(k) ? '🛕' : /hik|trek|trail/i.test(k) ? '🥾'
        : /park|reserve|forest|sanctuary/i.test(k) ? '🌳' : '📍';

function Scene({ family, seed }: { family: string; seed: number }) {
  const o = (seed % 5) * 12;
  if (family === 'water') return (
    <>
      <path d={`M0 70 L${80 + o} 30 L${150 + o} 60 L240 25 L330 55 L400 40 V120 H0Z`} fill="rgba(0,0,0,0.16)" />
      <rect x={180 + o} y="30" width="14" height="60" rx="7" fill="rgba(255,255,255,0.35)" />
      <path d="M0 88 Q50 80 100 88 T200 88 T300 88 T400 88 V120 H0Z" fill="rgba(255,255,255,0.18)" />
      <path d="M0 100 Q50 93 100 100 T200 100 T300 100 T400 100 V120 H0Z" fill="rgba(0,0,0,0.18)" />
    </>
  );
  if (family === 'views') return (
    <>
      <circle cx={300 - o} cy="38" r="16" fill="rgba(255,255,255,0.45)" />
      <path d={`M0 110 L${60 + o} 35 L120 75 L${200 - o} 8 L270 80 L330 40 L400 95 V120 H0Z`} fill="rgba(0,0,0,0.2)" />
      <path d={`M${200 - o} 8 L${185 - o} 26 L${215 - o} 26Z`} fill="rgba(255,255,255,0.6)" />
      <path d="M0 120 L80 80 L160 105 L240 70 L320 100 L400 82 V120Z" fill="rgba(0,0,0,0.22)" />
    </>
  );
  if (family === 'wild') return (
    <>
      <path d="M0 95 Q100 60 200 85 T400 75 V120 H0Z" fill="rgba(0,0,0,0.16)" />
      {[30, 70, 110, 250, 300, 350].map((x, i) => (
        <path key={x} d={`M${x + o} ${70 + (i % 3) * 6} l14 34 h-28Z`} fill="rgba(0,0,0,0.24)" />
      ))}
      <path d="M0 120 Q120 95 220 110 T400 100 V120Z" fill="rgba(0,0,0,0.2)" />
    </>
  );
  if (family === 'heritage') return (
    <>
      <path d="M0 105 Q200 90 400 100 V120 H0Z" fill="rgba(0,0,0,0.14)" />
      <path d={`M${110 + o} 105 V60 h12 v-8 h10 v8 h12 v-8 h10 v8 h12 v-8 h10 v8 h12 V105Z`} fill="rgba(0,0,0,0.26)" />
      <path d={`M${190 + o} 105 V45 h22 v60Z`} fill="rgba(0,0,0,0.3)" />
      <path d={`M${186 + o} 45 h30 l-15 -14Z`} fill="rgba(0,0,0,0.3)" />
    </>
  );
  if (family === 'sacred') return (
    <>
      <circle cx={90 + o} cy="35" r="18" fill="rgba(255,255,255,0.35)" />
      <path d="M0 105 Q200 92 400 102 V120 H0Z" fill="rgba(0,0,0,0.16)" />
      <path d={`M${170 + o} 105 V70 h60 v35Z M${178 + o} 70 L${200 + o} 22 L${222 + o} 70Z`} fill="rgba(0,0,0,0.28)" />
      <path d={`M${200 + o} 22 v-10`} stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
    </>
  );
  return <path d="M0 110 L70 50 L120 85 L190 30 L260 90 L320 55 L400 100 V120 H0Z" fill="rgba(0,0,0,0.18)" />;
}

/** Deterministic illustrated cover — no photo licensing, no broken images. */
export function GemArt({ g, className = '' }: { g: Pick<GemLike, 'id' | 'name' | 'family' | 'stateName'>; className?: string }) {
  const seed = hash(g.id);
  const list = PALETTES[g.family] ?? PALETTES.other;
  const [a, b] = list[seed % list.length];
  const pos = /\babsolute\b/.test(className) ? '' : 'relative';
  return (
    <div
      className={`${pos} overflow-hidden ${className}`}
      style={{ background: `radial-gradient(110% 80% at ${20 + (seed % 60)}% 0%, ${b} 0%, transparent 62%), linear-gradient(170deg, ${a}, ${a}dd 50%, ${b}bb)` }}
      role="img"
      aria-label={`${g.name}, ${g.stateName}`}
    >
      <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="absolute bottom-0 h-3/5 w-full" aria-hidden>
        <Scene family={g.family} seed={seed} />
      </svg>
    </div>
  );
}

const monthsLine = (m?: Month[]) => (m && m.length && m.length < 12 ? `${m.slice(0, 4).map((x) => monthShort(x)).join(', ')}${m.length > 4 ? '…' : ''}` : '');

/** Rail tile in the same language as the "Peaking now" tiles. */
export function GemTile({ g, eyebrow }: { g: GemLike; eyebrow?: string }) {
  return (
    <Link href={g.href} className="card-hover group relative block h-[440px] w-[280px] shrink-0 snap-start overflow-hidden rounded-apple bg-black shadow-tile sm:h-[480px] sm:w-[360px]">
      <GemArt g={g} className="absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-[1.04]" />
      <div className="absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-black/70 via-black/30 to-transparent" />
      <div className="relative p-7 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#ff9f5a]">{eyebrow ?? (g.gem ? `Hidden gem · ${g.kind}` : g.kind)}</p>
        <h3 className="mt-2 line-clamp-3 text-[26px] font-semibold leading-tight tracking-headline">{g.name}</h3>
        <p className="mt-2 line-clamp-2 text-[16px] leading-snug text-white/85">{g.area ? `${g.area} · ` : ''}{g.stateName}</p>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/60 to-transparent p-6 pt-12 text-sm text-white">
        {g.rating ? <span><span className="text-[#ffcc4d]">★</span> <b>{g.rating.toFixed(1)}</b> <span className="text-white/70">· {g.reviews?.toLocaleString('en-IN')}</span></span> : <span />}
        {monthsLine(g.months) && <span className="truncate text-white/80">Best {monthsLine(g.months)}</span>}
      </div>
    </Link>
  );
}

/** Grid card in the same language as PlaceCard. */
export function GemCard({ g, note }: { g: GemLike; note?: string }) {
  return (
    <Link href={g.href} className="card card-hover group flex flex-col overflow-hidden">
      <div className="relative">
        <GemArt g={g} className="aspect-[16/9]" />
        <span className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
          <span aria-hidden>{KIND_ICON(g.kind)}</span> {g.kind}
        </span>
        {g.gem && <span className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-ink">Hidden gem</span>}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-faint">{g.stateName}</p>
        <h3 className="mt-1 line-clamp-2 text-xl font-semibold leading-snug tracking-headline">{g.name}</h3>
        {g.area && <p className="mt-1 line-clamp-1 text-[15px] text-mute">{g.area}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4 text-sm">
          {g.rating ? <span className="pill"><span className="text-[#f5a623]">★</span>&nbsp;{g.rating.toFixed(1)} · {g.reviews?.toLocaleString('en-IN')}</span> : null}
          {note ? <span className="pill">{note}</span> : monthsLine(g.months) ? <span className="pill">best {monthsLine(g.months)}</span> : null}
        </div>
      </div>
    </Link>
  );
}
