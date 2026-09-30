import type { Destination, Month } from '@/lib/types';
import { allMonths, monthShort } from '@/lib/months';

export function MonthStrip({ d, highlight }: { d: Destination; highlight?: Month }) {
  const state = (m: Month) => (d.bestMonths.includes(m) ? 'best' : d.okMonths.includes(m) ? 'ok' : 'skip');
  const cls = { best: 'bg-blue text-white', ok: 'bg-blue-soft text-blue-link', skip: 'bg-paper text-faint line-through' } as const;
  return (
    <div>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
        {allMonths.map((m) => (
          <div key={m} title={state(m)} className={`rounded-xl py-2.5 text-center text-sm font-medium ${cls[state(m)]} ${m === highlight ? 'ring-2 ring-eyebrow ring-offset-2' : ''}`}>
            {monthShort(m)}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-5 text-xs text-mute">
        <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-blue align-middle" />Peak</span>
        <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-blue-soft align-middle ring-1 ring-blue/30" />Doable</span>
        <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-line align-middle" />Skip</span>
      </div>
    </div>
  );
}
