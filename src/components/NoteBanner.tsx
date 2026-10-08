import Link from 'next/link';
import { notesForState } from '@/data/notes';

/** "We've been here" card linking a state's field notes. Renders nothing if there are none. */
export function NoteBanner({ stateSlug, className = '' }: { stateSlug: string; className?: string }) {
  const notes = notesForState(stateSlug);
  if (!notes.length) return null;
  return (
    <div className={`grid gap-4 ${className}`}>
      {notes.map((n) => (
        <Link key={n.slug} href={`/notes/${n.slug}`} className="card card-hover flex items-center gap-4 overflow-hidden p-3 pr-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={n.hero.src} alt="" className="h-20 w-24 shrink-0 rounded-xl object-cover sm:h-24 sm:w-32" loading="lazy" />
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
