import Link from 'next/link';
import { noteSummary, notesInState } from '@/lib/notes';

/** "We've been here" card linking a state's field notes. Renders nothing if there are none. */
export function NoteBanner({ stateSlug, className = '' }: { stateSlug: string; className?: string }) {
  const notes = notesInState(stateSlug);
  if (!notes.length) return null;
  return (
    <div className={`grid gap-4 ${className}`}>
      {notes.map((n) => (
        <Link key={n.slug} href={`/notes/${n.slug}`} className="card card-hover flex items-center gap-4 overflow-hidden p-3 pr-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={n.image.src} alt="" className="h-20 w-24 shrink-0 rounded-xl object-cover sm:h-24 sm:w-32" loading="lazy" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-eyebrow">Field notes · we went in {n.visited}</span>
            <span className="mt-1 line-clamp-2 block text-[17px] font-semibold leading-snug">{n.title}</span>
          </span>
          <span className="hidden shrink-0 text-blue-link sm:block">Read ›</span>
        </Link>
      ))}
    </div>
  );
}

/** Grid card (PlaceCard-style) for a field note. */
export function NoteCard({ slug }: { slug: string }) {
  const n = noteSummary(slug);
  if (!n) return null;
  return (
    <Link href={`/notes/${n.slug}`} className="card card-hover group flex flex-col overflow-hidden">
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={n.image.src} alt={n.image.alt} className="aspect-[16/9] w-full object-cover" loading="lazy" />
        <span className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1 text-xs font-semibold text-white backdrop-blur">📝 Field notes · our own trip</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-faint">{n.stateName} · visited {n.visited}</p>
        <h3 className="mt-1 line-clamp-2 text-xl font-semibold leading-snug tracking-headline">{n.shortName}</h3>
        <p className="mt-1 line-clamp-2 text-[15px] text-mute">{n.intro}</p>
      </div>
    </Link>
  );
}
