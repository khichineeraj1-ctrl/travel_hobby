import Link from 'next/link';
import type { TravelEvent } from '@/lib/types';
import { CATEGORY_LABEL, countdown, fmtEventDates, phase } from '@/lib/events';
import { toDate } from '@/lib/booking';

export function DateBlock({ date, className = '' }: { date: string; className?: string }) {
  const d = toDate(date);
  return (
    <div className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-white text-ink shadow-tile ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-eyebrow">{d.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' })}</span>
      <span className="text-2xl font-semibold leading-none">{d.getUTCDate()}</span>
    </div>
  );
}

export function CountdownPill({ e }: { e: TravelEvent }) {
  const p = phase(e);
  const cls = p === 'live' ? 'bg-[#e9f7ee] text-good' : p === 'past' ? 'bg-paper text-mute' : 'bg-blue-soft text-blue-link';
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{countdown(e)}</span>;
}

export function EventCard({ e, wide = false }: { e: TravelEvent; wide?: boolean }) {
  return (
    <Link href={`/events/${e.slug}`} className={`card card-hover group flex flex-col p-6 ${wide ? 'h-full' : 'h-[280px] w-[300px] shrink-0 snap-start sm:w-[320px]'}`}>
      <div className="flex items-start justify-between gap-3">
        <DateBlock date={e.startDate} className="!shadow-none ring-1 ring-line" />
        <CountdownPill e={e} />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-faint">{CATEGORY_LABEL[e.category]} · {e.state}</p>
      <h3 className="mt-1 text-xl font-semibold leading-tight tracking-headline group-hover:text-blue-link">{e.name}</h3>
      <p className="mt-1.5 line-clamp-2 text-[15px] text-mute">{e.hook}</p>
      <p className="mt-auto pt-3 text-sm text-mute">{fmtEventDates(e)}{e.dateStatus === 'expected' ? ' (expected)' : ''} · {e.town}</p>
    </Link>
  );
}
