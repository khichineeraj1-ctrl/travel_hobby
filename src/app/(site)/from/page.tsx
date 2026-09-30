import { IndexTiles, PageHead } from '@/components/Listing';
import { getCities } from '@/lib/repo';
import { meta } from '@/lib/seo';

export const metadata = meta({
  title: 'Offbeat getaways from your city — sorted by travel time',
  description: 'Pick your starting city and see hidden destinations sorted by how long it actually takes to get there.',
  path: '/from',
});

export default function Page() {
  return (
    <div className="wrap">
      <PageHead crumbs={[{ name: 'From your city', path: '/from' }]} h1="Where are you escaping from?" intro="Every getaway, sorted by real door-to-door time." />
      <div className="mt-10"><IndexTiles items={getCities().map((c) => ({ href: `/from/${c.slug}`, title: c.name, sub: 'See getaways →' }))} /></div>
    </div>
  );
}
