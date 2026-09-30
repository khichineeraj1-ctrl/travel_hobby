import type { Metadata } from 'next';
import Link from 'next/link';
import { Planner } from '@/components/Planner';
import { SuggestionCard } from '@/components/SuggestionCard';
import { nearMisses, suggest } from '@/lib/engine';
import { guide } from '@/lib/guide';
import { LeadForm } from '@/components/LeadForm';
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

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]" {...(results.length ? guide(`Top pick: ${results[0].destination.name}. Want us to turn it into a day-by-day plan?`, { label: 'Plan it free', href: `/places/${results[0].destination.slug}#enquire` }) : {})}>
        <div className="space-y-6">
          {results.length ? (
            results.map((r, i) => <SuggestionCard key={r.destination.slug} s={r} from={input.from} rank={i + 1} />)
          ) : (
            <>
              <div className="card p-8" {...guide('No exact match — but here’s what’s closest. Or tell us and a human will find one.', { label: 'Ask a human', href: '#ask' })}>
                <p className="text-2xl font-semibold">Nothing fits that exact combo.</p>
                <p className="mt-2 text-mute">Far-flung gems need travel time. Here’s what’s closest — tweak one thing and these open up.</p>
              </div>
              {nearMisses(input).map((n) => (
                <div key={n.label} className="space-y-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-lg font-semibold">Works {n.label}</p>
                    <Link href={`/plan?${planToQuery(n.input)}`} className="link-arrow text-[15px]">Use this</Link>
                  </div>
                  {n.results.map((r, i) => <SuggestionCard key={r.destination.slug} s={r} from={n.input.from} rank={i + 1} />)}
                </div>
              ))}
              <div id="ask" className="card scroll-mt-20 p-8">
                <p className="text-xl font-semibold">Or let a human find it.</p>
                <p className="mt-1 text-mute">Free itinerary on WhatsApp — we know places that aren’t on here yet.</p>
                <div className="mt-5"><LeadForm kind="enquiry" source="/plan (no results)" compact /></div>
              </div>
            </>
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
