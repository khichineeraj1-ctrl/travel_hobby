import { Listing } from '@/components/Listing';
import { getAllDestinations } from '@/lib/repo';
import { meta } from '@/lib/seo';

export const metadata = meta({
  title: 'All offbeat places in India — hidden destinations list',
  description: 'Every less-travelled destination on Beyond Explored: hidden valleys, empty beaches, forgotten ruins and dark-sky villages across India.',
  path: '/places',
});

export default function Page() {
  const items = [...getAllDestinations()].sort((a, b) => a.crowd - b.crowd || a.name.localeCompare(b.name));
  return (
    <Listing
      crumbs={[{ name: 'Places', path: '/places' }]}
      kicker={`${items.length} places · least crowded first`}
      h1="Every place we rate."
      intro="No sponsored listings. No “top 10 hill stations”. Just places we’d send a friend to."
      items={items}
    />
  );
}
