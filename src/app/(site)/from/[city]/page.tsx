import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PageHead } from '@/components/Listing';
import { PlaceCard } from '@/components/PlaceCard';
import { LinkChips } from '@/components/LinkChips';
import { cityBySlug, getAllDestinations, getCities } from '@/lib/repo';
import { estimateTravel } from '@/lib/travel';
import { hrs } from '@/lib/format';
import { JsonLd } from '@/lib/jsonld';
import { itemListLd, meta } from '@/lib/seo';


export async function generateMetadata({ params }: { params: Promise<{ city: string }> }) {
  const c = cityBySlug((await params).city);
  if (!c) return {};
  return meta({
    title: `Offbeat weekend getaways from ${c.name} — hidden places by travel time`,
    description: `Less-travelled places near ${c.name} for a weekend or long leave, sorted by real door-to-door travel time by road, train or flight.`,
    path: `/from/${c.slug}`,
  });
}

const BUCKETS = [
  { max: 8, title: 'Weekend-able.', sub: 'Under 8 hours. Leave Friday night, back Sunday.' },
  { max: 14, title: 'Long weekend.', sub: '8–14 hours. Take the Monday off.' },
  { max: Infinity, title: 'Worth the leave.', sub: '14+ hours. A proper trip.' },
];

export default async function Page({ params }: { params: Promise<{ city: string }> }) {
  const c = cityBySlug((await params).city);
  if (!c) notFound();
  const cities = getCities();
  const rows = getAllDestinations()
    .map((d) => ({ d, t: estimateTravel(c, d, { cities }) }))
    .sort((a, b) => a.t.fastest.hours - b.t.fastest.hours);
  let lo = 0;
  const groups = BUCKETS.map((b) => {
    const items = rows.filter((r) => r.t.fastest.hours > lo && r.t.fastest.hours <= b.max);
    lo = b.max;
    return { ...b, items };
  });

  return (
    <div className="wrap">
      <JsonLd data={itemListLd(`Offbeat getaways from ${c.name}`, rows.map((r) => ({ name: r.d.name, path: `/places/${r.d.slug}` })))} />
      <PageHead
        crumbs={[{ name: 'From your city', path: '/from' }, { name: c.name, path: `/from/${c.slug}` }]}
        kicker={`Escape from ${c.name}`}
        h1={`Offbeat getaways from ${c.name}.`}
        intro="Sorted by door-to-door travel time, not distance on a map. 200 km of mountain road isn’t 200 km of expressway."
      />
      <Link href={`/plan?from=${c.slug}`} className="btn mt-4">Personalise for my dates</Link>

      {groups.map((g) =>
        g.items.length ? (
          <section key={g.title} className="mt-16">
            <h2 className="headline">{g.title} <span>{g.sub}</span></h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map(({ d, t }) => (
                <PlaceCard key={d.slug} d={d} from={c.slug} extra={<p className="mt-3 text-[15px] font-semibold text-blue-link">~{hrs(t.fastest.hours)} by {t.fastest.mode}</p>} />
              ))}
            </div>
          </section>
        ) : null,
      )}

      <section className="mt-20">
        <h2 className="mb-5 text-2xl font-semibold tracking-headline">Other starting points</h2>
        <LinkChips items={cities.filter((x) => x.slug !== c.slug).map((x) => ({ href: `/from/${x.slug}`, label: x.name }))} />
      </section>
    </div>
  );
}
