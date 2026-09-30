import { notFound } from 'next/navigation';
import { Listing, CrossLinks } from '@/components/Listing';
import { LinkChips } from '@/components/LinkChips';
import { getByCrew } from '@/lib/repo';
import { meta } from '@/lib/seo';
import type { Crew } from '@/lib/types';

const CREW: Record<Crew, { h1: string; title: string; intro: string }> = {
  solo: { h1: 'Offbeat trips for solo travellers.', title: 'Best Offbeat Places in India for Solo Travellers', intro: 'Safe-ish, social-ish, easy to navigate alone — with homestays where you’ll end up chatting with strangers over chai.' },
  duo: { h1: 'Offbeat getaways for two.', title: 'Offbeat Couple Getaways in India', intro: 'Quiet, scenic, zero crowd. for you + your person (or you + your best friend).' },
  squad: { h1: 'Offbeat squad trips.', title: 'Offbeat Group Trips in India for Friends', intro: 'Split the cab, split the bonfire wood. places that are more fun with 4–8 people.' },
  fam: { h1: 'Offbeat family trips. Parents approved.', title: 'Offbeat Family Holiday Destinations in India', intro: 'Decent roads, real beds, no 4,500m surprises. hidden places the whole family can actually enjoy.' },
};
const isCrew = (c: string): c is Crew => c in CREW;


export async function generateMetadata({ params }: { params: Promise<{ crew: string }> }) {
  const c = (await params).crew;
  if (!isCrew(c)) return {};
  return meta({ title: CREW[c].title, description: CREW[c].intro, path: `/for/${c}` });
}

export default async function Page({ params }: { params: Promise<{ crew: string }> }) {
  const c = (await params).crew;
  if (!isCrew(c)) notFound();
  return (
    <Listing crumbs={[{ name: `For ${c}`, path: `/for/${c}` }]} kicker="Who’s coming" h1={CREW[c].h1} intro={CREW[c].intro} items={getByCrew(c)} end={{ text: c === 'fam' ? 'Seen them all? Tell us who’s coming (grandparents too) and we’ll plan an easy one.' : c === 'solo' ? 'Going solo? We can pair you with a small group, or plan a safe solo route.' : 'Seen them all? Tell us your dates and we’ll match the best one for your crew.', label: c === 'solo' ? 'See group trips' : 'Plan it for us', href: c === 'solo' ? '/trips' : `/plan?crew=${c}` }}>
      <CrossLinks title="Going with someone else?">
        <LinkChips items={(Object.keys(CREW) as Crew[]).map((x) => ({ href: `/for/${x}`, label: x, active: x === c }))} />
      </CrossLinks>
    </Listing>
  );
}
