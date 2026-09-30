import { PageHead } from '@/components/Listing';
import { LeadForm } from '@/components/LeadForm';
import { meta } from '@/lib/seo';

export const metadata = meta({
  title: 'List your homestay, camp or guide service — partner with Beyond Explored',
  description: 'Run a homestay, camp or guiding service in a less-travelled corner of India? Apply to be a Beyond Explored partner.',
  path: '/partners',
});

export default function Partners() {
  return (
    <div className="wrap">
      <PageHead crumbs={[{ name: 'Partners', path: '/partners' }]} kicker="For hosts, guides & operators" h1="Host the curious ones." intro="We send respectful, small-group travellers to places that deserve them. No listing fee." />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <LeadForm kind="partner" source="/partners" />
        <div className="space-y-4">
          {[
            ['Zero listing fee.', 'We earn a small commission only on confirmed bookings.'],
            ['Travellers who get it.', 'Our crowd comes for the slow, local experience — not a resort.'],
            ['You stay in control.', 'Set your rooms, prices and blackout dates.'],
          ].map(([t, b]) => (
            <div key={t} className="card p-6"><p className="font-semibold">{t}</p><p className="mt-1 text-[15px] text-mute">{b}</p></div>
          ))}
        </div>
      </div>
    </div>
  );
}
