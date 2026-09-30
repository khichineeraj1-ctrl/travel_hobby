import { notFound } from 'next/navigation';
import { Listing, CrossLinks } from '@/components/Listing';
import { LinkChips } from '@/components/LinkChips';
import { getByVibe, getVibes, vibeById } from '@/lib/repo';
import { meta } from '@/lib/seo';


export async function generateMetadata({ params }: { params: Promise<{ vibe: string }> }) {
  const v = vibeById((await params).vibe);
  if (!v) return {};
  return meta({ title: `${v.seoTitle} (${v.label})`, description: `${v.blurb} Handpicked less-travelled places in India for a ${v.label.toLowerCase()} trip.`, path: `/vibe/${v.id}` });
}

export default async function Page({ params }: { params: Promise<{ vibe: string }> }) {
  const v = vibeById((await params).vibe);
  if (!v) notFound();
  return (
    <Listing
      crumbs={[{ name: 'Vibes', path: '/vibe' }, { name: v.label, path: `/vibe/${v.id}` }]}
      kicker={`${v.emoji} ${v.label}`}
      h1={v.seoTitle + '.'}
      intro={v.blurb}
      items={getByVibe(v.id).sort((a, b) => a.crowd - b.crowd)}
      end={{ text: `All ${v.label.toLowerCase()} places, seen. Want the one that fits your dates and budget?`, label: 'Match my vibe', href: `/plan?vibes=${v.id}` }}
    >
      <CrossLinks title="Other vibes">
        <LinkChips items={getVibes().map((x) => ({ href: `/vibe/${x.id}`, label: `${x.emoji} ${x.label}`, active: x.id === v.id }))} />
      </CrossLinks>
    </Listing>
  );
}
