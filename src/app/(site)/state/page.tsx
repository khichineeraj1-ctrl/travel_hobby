import { IndexTiles, PageHead } from '@/components/Listing';
import { getByState, getStates } from '@/lib/repo';
import { meta } from '@/lib/seo';

export const metadata = meta({
  title: 'Offbeat places by state — hidden destinations across India',
  description: 'Browse less-travelled destinations in every Indian state.',
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
