import { IndexTiles, PageHead } from '@/components/Listing';
import { getByMonth } from '@/lib/repo';
import { allMonths, monthLabel, monthName } from '@/lib/months';
import { meta } from '@/lib/seo';

export const metadata = meta({
  title: 'Offbeat Places in India, Month by Month',
  description: 'Where to go in India each month — less-travelled destinations at their seasonal best.',
  path: '/when',
});

export default function Page() {
  return (
    <div className="wrap">
      <PageHead crumbs={[{ name: 'Months', path: '/when' }]} h1="When are you going?" intro="Every month has somewhere at its absolute best." />
      <div className="mt-10"><IndexTiles items={allMonths.map((m) => ({ href: `/when/${monthName(m)}`, title: monthLabel(m), sub: `${getByMonth(m).length} places at their peak` }))} /></div>
    </div>
  );
}
