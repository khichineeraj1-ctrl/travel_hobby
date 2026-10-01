import type { Metadata } from 'next';
import { getAllDestinations } from '@/lib/repo';
import { readDb } from '@/lib/db';
import { fmtEventDates } from '@/lib/events';
import { todayIST } from '@/lib/booking';
import { BookShell } from '@/components/BookShell';
import { Checkout } from '@/components/Checkout';
import { gemBySlug, nearestGuide } from '@/lib/gemPages';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Request a custom trip', robots: { index: false } };

export default async function BookCustom({ searchParams }: { searchParams: Promise<{ place?: string; event?: string; roadtrip?: string; gem?: string }> }) {
  const { place, event, roadtrip, gem } = await searchParams;
  const gm = gem ? gemBySlug(gem) : undefined;
  const gmBase = gm ? nearestGuide(gm) : undefined;
  const db = readDb();
  const ev = event ? db.events.find((e) => e.slug === event && e.status === 'published') : undefined;
  const rt = roadtrip ? db.roadTrips.find((r) => r.slug === roadtrip && r.published) : undefined;
  const context: { label: string; fields: Record<string, string> } | undefined = ev ? { label: `For ${ev.name} · ${fmtEventDates(ev)}`, fields: { event: ev.name, eventDates: fmtEventDates(ev) } }
    : rt ? { label: `Road trip · ${rt.title}`, fields: { roadTrip: rt.title } }
      : gm ? { label: `Trip to ${gm.name} · ${gm.stateName}`, fields: { gem: `${gm.name}, ${gm.area ? `${gm.area}, ` : ''}${gm.stateName}` } } : undefined;
  const places = getAllDestinations().map((d) => ({ slug: d.slug, name: d.name })).sort((a, b) => a.name.localeCompare(b.name));
  const def = places.find((p) => p.slug === (place ?? gmBase?.d.slug))?.slug;
  return (
    <BookShell
      crumbs={[{ name: 'Custom trip', path: '/book/custom' }]}
      title={ev ? `${ev.name}, sorted.` : rt ? `${rt.title}, sorted.` : gm ? `${gm.name}, sorted.` : 'Your trip, your way.'}
      sub="Tell us the basics. We’ll send a plan and a quote within 24 hours — free, no commitment."
      aside={
        <div className="card p-6 text-[15px]">
          <p className="font-semibold">What you get</p>
          <ul className="mt-3 space-y-2 text-mute">
            <li>✓ A day-by-day plan built around your dates</li>
            <li>✓ Handpicked homestays, drivers and guides</li>
            <li>✓ Permits sorted where needed</li>
            <li>✓ One price, no surprises. Pay only when you’re happy.</li>
          </ul>
        </div>
      }
    >
      <Checkout kind="custom" places={places} defaultPlace={def} today={todayIST()} source="/book/custom" context={context} />
    </BookShell>
  );
}
