import { IndexTiles, PageHead } from '@/components/Listing';
import { getByState, getStates } from '@/lib/repo';
import { meta } from '@/lib/seo';

export const metadata = meta({
  title: 'Offbeat Places in India, State by State',
  description: 'Browse offbeat, less-travelled destinations in every Indian state — with the best time to go, travel time from your city and honest costs.',
  path: '/state',
});

export default function Page() {
  return (
    <div className="wrap">
      <PageHead crumbs={[{ name: 'States', path: '/state' }]} h1="Pick a state." intro="The parts of every state most people skip." />
      <div className="mt-10"><IndexTiles items={getStates().map((s) => ({ href: `/state/${s.slug}`, title: s.name, sub: `${getByState(s.slug).length} places` }))} /></div>
    </div>
  );
}
