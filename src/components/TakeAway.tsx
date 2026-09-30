import Link from 'next/link';
import { getByMonth } from '@/lib/repo';
import { currentMonth, monthLabel, monthName } from '@/lib/months';
import { guide } from '@/lib/guide';
import { PlaceArt } from './PlaceCard';
import { inr } from '@/lib/format';

/** Bottom-of-every-page "don't leave empty-handed": 3 places at their best this month (rotates daily). */
export function TakeAway() {
  const m = currentMonth();
  const pool = getByMonth(m);
  if (!pool.length) return null;
  const day = Math.floor(Date.now() / 86_400_000);
  const picks = Array.from({ length: Math.min(3, pool.length) }, (_, i) => pool[(day * 3 + i) % pool.length]);
  return (
    <section
      className="wrap mt-24"
      aria-label="Places at their best this month"
      {...guide(`Leaving? Take one idea with you — these are at their best in ${monthLabel(m)}.`, { label: 'Get the monthly drop', href: '#newsletter' })}
    >
      <div className="rounded-apple bg-white p-6 shadow-tile sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-headline sm:text-[28px]">Don’t leave empty-handed. <span className="text-mute">Peaking in {monthLabel(m)}.</span></h2>
          <Link href={`/when/${monthName(m)}`} className="link-arrow text-[15px]">All {pool.length} places</Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {picks.map((d) => (
            <Link key={d.slug} href={`/places/${d.slug}`} className="group flex min-w-0 items-center gap-4 rounded-2xl p-2 transition hover:bg-paper">
              <PlaceArt d={d} className="h-16 w-20 shrink-0 rounded-xl" />
              <span className="min-w-0">
                <span className="block truncate font-semibold group-hover:text-blue-link">{d.name}</span>
                <span className="block truncate text-sm text-mute">{d.hook}</span>
                <span className="text-xs text-faint">from {inr(d.budgetPerDay[0])}/day</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
