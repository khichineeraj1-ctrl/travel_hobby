import Link from 'next/link';
import type { Suggestion } from '@/lib/types';
import { PlaceArt } from './PlaceCard';
import { hrs, inr } from '@/lib/format';

const ICON = { road: '🚗', train: '🚆', flight: '✈️' } as const;

export function SuggestionCard({ s, from, rank }: { s: Suggestion; from: string; rank: number }) {
  const d = s.destination;
  const href = `/places/${d.slug}?from=${from}`;
  return (
    <article className="card grid overflow-hidden sm:grid-cols-[240px_1fr]">
      <PlaceArt d={d} className="h-40 sm:h-full" />
      <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-faint">#{rank} · {d.state}</p>
            <h3 className="mt-1 text-[28px] font-semibold leading-tight tracking-headline">
              <Link href={href} className="hover:text-blue-link">{d.name}</Link>
            </h3>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-3xl font-semibold tracking-tightest text-blue">{s.score}</p>
            <p className="text-xs text-faint">match</p>
          </div>
        </div>
        <p className="mt-1 text-[17px] text-mute">{d.hook}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="pill !text-sm !text-ink">{ICON[s.travel.fastest.mode]} {hrs(s.travel.fastest.hours)} one way</span>
          <span className="pill !text-sm !text-ink">~{s.hoursOnGround}h on the ground</span>
          <span className="pill !text-sm !text-ink">{inr(d.budgetPerDay[0])}–{inr(d.budgetPerDay[1])}/day</span>
        </div>
        <ul className="mt-4 space-y-1 text-[15px]">
          {s.reasons.map((r) => <li key={r} className="flex gap-2"><span className="text-good">✓</span>{r}</li>)}
          {s.warnings.map((w) => <li key={w} className="flex gap-2 text-warn"><span>!</span>{w}</li>)}
        </ul>
        <Link href={href} className="link-arrow mt-4 text-[15px]">Learn more</Link>
      </div>
    </article>
  );
}
