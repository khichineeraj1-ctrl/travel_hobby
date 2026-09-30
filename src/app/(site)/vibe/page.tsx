import { IndexTiles, PageHead } from '@/components/Listing';
import { getByVibe, getVibes } from '@/lib/repo';
import { meta } from '@/lib/seo';

export const metadata = meta({
  title: 'Travel by Vibe: Offbeat India Trips by Mood',
  description: 'Digital detox, stargazing, budget, adventure, slow travel — find offbeat Indian destinations by the vibe you want.',
  path: '/vibe',
});

export default function Page() {
  return (
    <div className="wrap">
      <PageHead crumbs={[{ name: 'Vibes', path: '/vibe' }]} h1="What’s the vibe?" intro="Pick a mood. We’ll handle the map." />
      <div className="mt-10">
        <IndexTiles items={getVibes().map((v) => ({ href: `/vibe/${v.id}`, title: v.label, sub: `${v.blurb} · ${getByVibe(v.id).length} places`, emoji: v.emoji }))} />
      </div>
    </div>
  );
}
