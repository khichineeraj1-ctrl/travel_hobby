'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { TravelEstimate } from '@/lib/types';
import { hrs } from '@/lib/format';

const ICON = { road: '🚗', train: '🚆', flight: '✈️' } as const;

/** Personalised "from your city" box. Client-side so the place page stays static; estimates are precomputed on the server. */
export function FromBanner({ estimates }: { estimates: Record<string, { name: string; t: TravelEstimate }> }) {
  const sp = useSearchParams();
  const slug = sp.get('from') ?? '';
  const hit = estimates[slug];
  if (!hit) return null;
  const { name, t } = hit;
  const rolled = sp.get('rolled') === '1';
  return (
    <div className="card p-6">
      {rolled && <p className="kicker mb-2">🎲 The dice has spoken.</p>}
      <p className="text-sm text-mute">From {name}</p>
      <p className="mt-1 text-4xl font-semibold tracking-tightest">{ICON[t.fastest.mode]} ~{hrs(t.fastest.hours)}</p>
      <p className="mt-1 text-[15px]">{t.fastest.note}</p>
      {t.options.slice(1).map((o) => (
        <p key={o.mode} className="mt-1 text-sm text-mute">or {ICON[o.mode]} ~{hrs(o.hours)} — {o.note}</p>
      ))}
      {rolled && (
        <Link href={`/roll?from=${slug}`} prefetch={false} className="link-arrow mt-4 text-[15px]">Not feeling it? Roll again</Link>
      )}
    </div>
  );
}
