import type { StayRates } from '@/lib/types';
import { inr } from '@/lib/format';

const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** Live nightly room prices near a place (from LiteAPI), shown in the place sidebar. */
export function StayPrices({ r, onGround }: { r: StayRates; onGround: [number, number] }) {
  return (
    <div className="mt-5 border-t border-line/70 pt-5">
      <p className="text-[28px] font-semibold leading-none tracking-headline">{inr(r.min)}<span className="text-base font-normal text-mute"> /night</span></p>
      <p className="mt-1 text-sm text-mute">cheapest room for two · typical {inr(r.median)} · {r.count} stays within 25 km</p>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[['Budget', r.p25], ['Typical', r.median], ['Comfy', r.p75]].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-paper px-2 py-2.5">
            <dt className="text-[11px] text-faint">{k}</dt>
            <dd className="text-[15px] font-semibold">{inr(v as number)}</dd>
          </div>
        ))}
      </dl>
      {r.hotels.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-sm">
          {r.hotels.filter((h) => h.name !== 'Stay').slice(0, 4).map((h) => (
            <li key={h.id} className="flex justify-between gap-3">
              <a className="truncate hover:text-blue-link" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name)}`}>{h.name}</a>
              <span className="shrink-0 text-mute">{inr(h.price)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-[11px] leading-snug text-faint">
        Live rates, 1 room for 2 adults incl. taxes, sampled for {r.dates.map(day).join(' & ')}; checked {day(r.at)}. Budget/day = room ÷ 2 + about {inr(onGround[0])}–{inr(onGround[1])} for food & local travel (estimate).
      </p>
    </div>
  );
}
