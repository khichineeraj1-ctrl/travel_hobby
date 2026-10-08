import { notFound } from 'next/navigation';
import Link from 'next/link';
import { gemsFor } from '@/lib/gems';
import { SpotTile } from '@/components/SpotTile';
import { NoteBanner } from '@/components/NoteBanner';
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
      <NoteBanner stateSlug={s.slug} />
      {gemsFor(s.slug).length > 0 && (
        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-2xl font-semibold tracking-headline">More hidden gems in {s.name}</h2>
            <Link href={`/hidden-gems/${s.slug}`} className="link-arrow text-[15px]">All {gemsFor(s.slug).length}</Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{gemsFor(s.slug).slice(0, 6).map((g) => <SpotTile key={g.id} s={g} />)}</div>
        </section>
      )}
      <CrossLinks title="Other states">
        <LinkChips items={getStates().filter((x) => x.slug !== s.slug).map((x) => ({ href: `/state/${x.slug}`, label: x.name }))} />
      </CrossLinks>
    </Listing>
  );
}
