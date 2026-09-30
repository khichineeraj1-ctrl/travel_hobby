import { notFound } from 'next/navigation';
import { Listing, CrossLinks } from '@/components/Listing';
import { LinkChips } from '@/components/LinkChips';
import { getByState, getStates } from '@/lib/repo';
import { meta } from '@/lib/seo';


export async function generateMetadata({ params }: { params: Promise<{ state: string }> }) {
  const slug = (await params).state;
  const s = getStates().find((x) => x.slug === slug);
  if (!s) return {};
  return meta({
    title: `Offbeat Places in ${s.name}: Hidden, Less-Travelled`,
    description: `Hidden gems in ${s.name}: best time to visit, travel time from your city, and honest tips.`,
    path: `/state/${s.slug}`,
  });
}

export default async function Page({ params }: { params: Promise<{ state: string }> }) {
  const slug = (await params).state;
  const s = getStates().find((x) => x.slug === slug);
  if (!s) notFound();
  return (
    <Listing
      crumbs={[{ name: 'States', path: '/state' }, { name: s.name, path: `/state/${s.slug}` }]}
      kicker={s.name}
      h1={`Offbeat places in ${s.name}.`}
      intro={`The ${s.name} most people skip.`}
      items={getByState(s.slug).sort((a, b) => a.crowd - b.crowd)}
      end={{ text: `That’s our ${s.name} list. Want us to string two or three of these into one trip?`, label: 'Plan a combo', href: `/book/custom` }}
    >
      <CrossLinks title="Other states">
        <LinkChips items={getStates().filter((x) => x.slug !== s.slug).map((x) => ({ href: `/state/${x.slug}`, label: x.name }))} />
      </CrossLinks>
    </Listing>
  );
}
