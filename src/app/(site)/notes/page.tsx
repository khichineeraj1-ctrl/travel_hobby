import Link from 'next/link';
import { PageHead } from '@/components/Listing';
import { allNotes } from '@/lib/notes';

export const dynamic = 'force-dynamic';
import { meta } from '@/lib/seo';

export const metadata = meta({
  title: 'Field Notes: First-Hand Trip Tips from India',
  description: 'Things we learned on the ground — safari zone dates, how to book, where to eat — with our own photos. No copy-paste travel blog stuff.',
  path: '/notes',
});

export default function Notes() {
  return (
    <div className="wrap">
      <PageHead crumbs={[{ name: 'Field notes', path: '/notes' }]} kicker="From our own trips" h1="Field notes." intro="What we learned on the ground — the stuff that isn’t on the brochure. Our photos, our mistakes, so you skip them." />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {allNotes().map((n) => (
          <Link key={n.slug} href={`/notes/${n.slug}`} className="card card-hover group flex flex-col overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={n.image.src} alt={n.image.alt} className="aspect-[16/10] w-full object-cover" loading="lazy" />
            <div className="flex flex-1 flex-col p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-faint">{n.stateName} · {n.visited}</p>
              <h2 className="mt-1 text-xl font-semibold leading-snug tracking-headline">{n.title}</h2>
              <p className="mt-2 line-clamp-3 text-[15px] text-mute">{n.intro}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
