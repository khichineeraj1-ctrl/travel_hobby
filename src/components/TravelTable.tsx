import Link from 'next/link';
import type { TravelEstimate } from '@/lib/types';
import { hrs } from '@/lib/format';

export const MODE_ICON = { road: '🚗', train: '🚆', flight: '✈️' } as const;

export function TravelTable({ rows }: { rows: { slug: string; name: string; t: TravelEstimate }[] }) {
  return (
    <div>
      <div className="card overflow-hidden">
        <table className="w-full text-left text-[15px]">
          <thead className="border-b border-line text-xs font-semibold uppercase tracking-wide text-faint">
            <tr>
              <th className="px-6 py-3">From</th>
              <th className="px-6 py-3">Fastest</th>
              <th className="hidden px-6 py-3 sm:table-cell">How</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ slug, name, t }) => (
              <tr key={slug} className="border-b border-line/60 last:border-0">
                <td className="px-6 py-3 font-medium"><Link href={`/from/${slug}`} className="hover:text-blue-link">{name}</Link></td>
                <td className="whitespace-nowrap px-6 py-3">{MODE_ICON[t.fastest.mode]} {hrs(t.fastest.hours)}</td>
                <td className="hidden px-6 py-3 text-mute sm:table-cell">{t.fastest.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-faint">
        {rows.some((r) => r.t.options.some((o) => o.routed))
          ? 'Road legs use real road distances from OpenStreetMap routing, adjusted for Indian traffic and hills. Flights and trains are estimated. Not a booking quote.'
          : 'Door-to-door estimates incl. airport time and last-mile roads. Not a booking quote.'}
      </p>
    </div>
  );
}
