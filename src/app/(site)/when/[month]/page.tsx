import { notFound } from 'next/navigation';
import { Listing, CrossLinks } from '@/components/Listing';
import { LinkChips } from '@/components/LinkChips';
import { getByMonth } from '@/lib/repo';
import { MONTHS, monthFromSlug, monthLabel } from '@/lib/months';
import { meta } from '@/lib/seo';


export async function generateMetadata({ params }: { params: Promise<{ month: string }> }) {
  const m = monthFromSlug((await params).month);
  if (!m) return {};
  const L = monthLabel(m);
  return meta({
    title: `Offbeat places to visit in ${L} in India`,
    description: `Less-crowded destinations in India that are at their best in ${L} — weather, travel time and honest tips.`,
    path: `/when/${MONTHS[m - 1]}`,
  });
}

export default async function Page({ params }: { params: Promise<{ month: string }> }) {
  const m = monthFromSlug((await params).month);
  if (!m) notFound();
  const L = monthLabel(m);
  return (
    <Listing
      crumbs={[{ name: 'Months', path: '/when' }, { name: L, path: `/when/${MONTHS[m - 1]}` }]}
      kicker={`Peak season in ${L}`}
      h1={`Offbeat places to visit in ${L}.`}
      intro={`These spots are at their absolute best in ${L}. Least crowded first.`}
      items={getByMonth(m).sort((a, b) => a.crowd - b.crowd)}
    >
      <CrossLinks title="Other months">
        <LinkChips items={MONTHS.map((x, i) => ({ href: `/when/${x}`, label: monthLabel((i + 1) as never).slice(0, 3), active: i + 1 === m }))} />
      </CrossLinks>
    </Listing>
  );
}
