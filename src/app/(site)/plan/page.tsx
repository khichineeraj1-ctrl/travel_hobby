import type { Metadata } from 'next';
import Link from 'next/link';
import { Planner } from '@/components/Planner';
import { SuggestionCard } from '@/components/SuggestionCard';
import { suggest } from '@/lib/engine';
import { parsePlan, planToQuery } from '@/lib/plan';
import { cityBySlug, getCities, getSettings, getVibes, planLookup } from '@/lib/repo';
import { crewLabel, inr } from '@/lib/format';
import { monthLabel } from '@/lib/months';
import { meta } from '@/lib/seo';

export const metadata: Metadata = meta({
  title: 'Your offbeat trip matches',
  description: 'Offbeat destinations matched to your days, budget, crew and vibe.',
  path: '/plan',
  noindex: true,
});

export default async function PlanPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const input = parsePlan(await searchParams, planLookup);
  const results = suggest(input, 10);
  const city = cityBySlug(input.from)!;
  const s = getSettings();

  return (
    <div className="wrap pt-12">
      <p className="kicker">Your matches</p>
      <h1 className="mt-2 text-[40px] font-semibold leading-tight tracking-tightest sm:text-[56px]">
        {input.days} {input.days === 1 ? 'day' : 'days'} from {city.name}.
        <span className="text-mute"> {crewLabel[input.crew][0].toUpperCase() + crewLabel[input.crew].slice(1)}, {monthLabel(input.month)}.</span>
      </h1>
      <p className="mt-3 text-lg text-mute">~{inr(input.budget)}/day per person · ranked by how well the trip works, not who paid us.</p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {results.length ? (
            results.map((r, i) => <SuggestionCard key={r.destination.slug} s={r} from={input.from} rank={i + 1} />)
          ) : (
            <div className="card p-10">
              <p className="text-2xl font-semibold">Nothing fits that combo.</p>
              <p className="mt-2 text-mute">Try adding a day or two, or turn off “basically nobody’s heard of” — far-flung gems need travel time.</p>
            </div>
          )}
          {results.length > 0 && (
            <Link href={`/roll?${planToQuery(input)}`} className="btn-secondary" prefetch={false}>🎲 Can’t decide? Pick one for me</Link>
          )}
        </div>
        <aside className="lg:sticky lg:top-16 lg:self-start">
          <p className="label">Refine</p>
          <Planner initial={input} cities={getCities()} vibes={getVibes()} labels={{ submitLabel: 'Update', rollLabel: s.planner.rollLabel }} compact />
        </aside>
      </div>
    </div>
  );
}
