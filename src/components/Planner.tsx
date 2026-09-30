'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Crew, Month, OriginCity, PlanInput, Vibe } from '@/lib/types';
import { allMonths, monthLabel } from '@/lib/months';
import { planToQuery } from '@/lib/plan';

const CREWS: { id: Crew; label: string; sub: string }[] = [
  { id: 'solo', label: 'Just me', sub: 'Solo' },
  { id: 'duo', label: 'Me + 1', sub: 'Couple / bestie' },
  { id: 'squad', label: 'The squad', sub: '3–8 friends' },
  { id: 'fam', label: 'Fam trip', sub: 'Parents approved' },
];
const BUDGETS = [
  { v: 1000, label: 'Broke', sub: 'Up to ₹1k/day' },
  { v: 2000, label: 'Chill', sub: '~₹2k/day' },
  { v: 3500, label: 'Comfy', sub: '~₹3.5k/day' },
  { v: 6000, label: 'Treat myself', sub: '₹6k+/day' },
];

type Labels = { submitLabel: string; rollLabel: string };

export function Planner({ initial, cities, vibes, labels, compact = false }: {
  initial: PlanInput; cities: OriginCity[]; vibes: Vibe[]; labels: Labels; compact?: boolean;
}) {
  const router = useRouter();
  const [p, setP] = useState<PlanInput>(initial);
  const set = <K extends keyof PlanInput>(k: K, v: PlanInput[K]) => setP((s) => ({ ...s, [k]: v }));
  const toggleVibe = (id: string) =>
    set('vibes', p.vibes.includes(id) ? p.vibes.filter((v) => v !== id) : [...p.vibes, id].slice(-3));

  const Option = ({ on, onClick, title, sub }: { on: boolean; onClick: () => void; title: string; sub?: string }) => (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-left transition ${on ? 'border-blue ring-1 ring-blue' : 'border-line hover:border-faint'} bg-white`}
    >
      <span className="block text-[15px] font-semibold">{title}</span>
      {sub && <span className="block text-xs text-mute">{sub}</span>}
    </button>
  );

  return (
    <form
      className={`card ${compact ? 'space-y-6 p-6' : 'space-y-8 p-6 sm:p-10'}`}
      onSubmit={(e) => { e.preventDefault(); router.push(`/plan?${planToQuery(p)}`); }}
    >
      <div className={compact ? 'grid gap-4' : 'grid gap-6 sm:grid-cols-3'}>
        <label className="block">
          <span className="label">Leaving from</span>
          <select className="field" value={p.from} onChange={(e) => set('from', e.target.value)}>
            {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="label">Going in</span>
          <select className="field" value={p.month} onChange={(e) => set('month', Number(e.target.value) as Month)}>
            {allMonths.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="label">Trip length · <span className="text-ink">{p.days} {p.days === 1 ? 'day' : 'days'}</span></span>
          <input type="range" min={1} max={12} value={p.days} onChange={(e) => set('days', Number(e.target.value))} className="mt-3 w-full" aria-label="Trip length in days" />
          <span className="flex justify-between text-xs text-faint"><span>Day trip</span><span>Long leave</span></span>
        </label>
      </div>

      <fieldset>
        <legend className="label">Who’s coming</legend>
        <div className={`grid gap-2.5 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
          {CREWS.map((c) => <Option key={c.id} on={p.crew === c.id} onClick={() => set('crew', c.id)} title={c.label} sub={c.sub} />)}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Budget, per person per day</legend>
        <div className={`grid gap-2.5 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
          {BUDGETS.map((b) => <Option key={b.v} on={p.budget === b.v} onClick={() => set('budget', b.v)} title={b.label} sub={b.sub} />)}
        </div>
      </fieldset>

      {!compact && (
        <fieldset>
          <legend className="label">The vibe · pick up to 3, or skip</legend>
          <div className="flex flex-wrap gap-2.5">
            {vibes.map((v) => (
              <button type="button" key={v.id} className="chip" aria-pressed={p.vibes.includes(v.id)} onClick={() => toggleVibe(v.id)} title={v.blurb}>
                <span>{v.emoji}</span> {v.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <label className="flex cursor-pointer items-center gap-3 text-[15px]">
        <input type="checkbox" className="h-5 w-5 accent-[#0071e3]" checked={p.maxCrowd === 2} onChange={(e) => set('maxCrowd', e.target.checked ? 2 : undefined)} />
        Only places basically nobody’s heard of
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn">{labels.submitLabel}</button>
        <button type="button" className="btn-secondary" onClick={() => router.push(`/roll?${planToQuery(p)}`)}>
          🎲 {labels.rollLabel}
        </button>
      </div>
    </form>
  );
}
