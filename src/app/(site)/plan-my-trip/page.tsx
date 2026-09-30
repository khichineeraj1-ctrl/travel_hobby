import { PageHead } from '@/components/Listing';
import { guide, guideQuiet } from '@/lib/guide';
import { LeadForm } from '@/components/LeadForm';
import { getAllDestinations } from '@/lib/repo';
import { meta } from '@/lib/seo';

export const metadata = meta({
  title: 'Plan my offbeat trip — free itinerary from locals',
  description: 'Tell us your dates, crew and budget. Get a free, personalised offbeat India itinerary on WhatsApp within 24 hours.',
  path: '/plan-my-trip',
});

export default function PlanMyTrip() {
  const places = getAllDestinations().map((d) => ({ slug: d.slug, name: d.name })).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="wrap" {...guideQuiet}>
      <PageHead crumbs={[{ name: 'Plan my trip', path: '/plan-my-trip' }]} kicker="Free · reply within 24 hours" h1="Plan my trip." intro="Tell us roughly what you want. A real person replies on WhatsApp with 2–3 ideas, routes and costs." />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <LeadForm kind="enquiry" source="/plan-my-trip" places={places} />
        <div className="space-y-4">
          {[
            ['No spam, no packages.', 'We only suggest places we’d send our friends to.'],
            ['Local knowledge.', 'Permits, road status, which homestay has hot water.'],
            ['Book only if you love it.', 'Ideas are free. Reserve later with nothing to pay upfront.'],
          ].map(([t, b]) => (
            <div key={t} className="card p-6"><p className="font-semibold">{t}</p><p className="mt-1 text-[15px] text-mute">{b}</p></div>
          ))}
        </div>
      </div>
    </div>
  );
}
