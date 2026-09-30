import Link from 'next/link';
import { Breadcrumbs } from './Breadcrumbs';
import { PlaceGrid } from './PlaceCard';
import { JsonLd } from '@/lib/jsonld';
import { itemListLd } from '@/lib/seo';
import type { Destination } from '@/lib/types';

export function PageHead({ crumbs, kicker, h1, intro }: { crumbs: { name: string; path: string }[]; kicker?: string; h1: string; intro?: React.ReactNode }) {
  return (
    <div className="pb-4 pt-6">
      <Breadcrumbs items={crumbs} />
      {kicker && <p className="kicker mt-10">{kicker}</p>}
      <h1 className={`${kicker ? 'mt-2' : 'mt-10'} max-w-4xl text-[40px] font-semibold leading-[1.05] tracking-tightest sm:text-[64px]`}>{h1}</h1>
      {intro && <div className="mt-4 max-w-2xl text-xl leading-snug text-mute sm:text-2xl">{intro}</div>}
    </div>
  );
}

export function Listing(props: {
  crumbs: { name: string; path: string }[];
  kicker: string;
  h1: string;
  intro: React.ReactNode;
  items: Destination[];
  from?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="wrap">
      <JsonLd data={itemListLd(props.h1, props.items.map((d) => ({ name: d.name, path: `/places/${d.slug}` })))} />
      <PageHead crumbs={props.crumbs} kicker={props.kicker} h1={props.h1} intro={props.intro} />
      <div className="mt-10">
        {props.items.length ? <PlaceGrid items={props.items} from={props.from} /> : <p className="card p-8 text-mute">Nothing here yet — we’re scouting.</p>}
      </div>
      {props.children && <div className="mt-20 space-y-12">{props.children}</div>}
    </div>
  );
}

export function CrossLinks({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-5 text-2xl font-semibold tracking-headline">{title}</h2>
      {children}
    </section>
  );
}

/** Index pages (vibes, months, states, cities): a grid of simple tiles */
export function IndexTiles({ items }: { items: { href: string; title: string; sub?: string; emoji?: string }[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className="card card-hover block p-7">
          {i.emoji && <p className="text-4xl">{i.emoji}</p>}
          <p className={`${i.emoji ? 'mt-3' : ''} text-2xl font-semibold tracking-headline`}>{i.title}</p>
          {i.sub && <p className="mt-1 text-[15px] text-mute">{i.sub}</p>}
        </Link>
      ))}
    </div>
  );
}
