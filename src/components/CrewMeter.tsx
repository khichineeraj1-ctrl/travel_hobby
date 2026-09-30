import type { Crew, Destination } from '@/lib/types';
import { crewLabel, sentence } from "@/lib/format";

const verdict = ['', 'Not ideal', 'Meh', 'Works', 'Great', 'Perfect'];

export function CrewMeter({ d }: { d: Destination }) {
  return (
    <div className="card grid gap-x-10 gap-y-5 p-7 sm:grid-cols-2">
      {(Object.keys(d.crewFit) as Crew[]).map((c) => (
        <div key={c}>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-semibold">{sentence(crewLabel[c])}</span>
            <span className="text-sm text-mute">{verdict[d.crewFit[c]]}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-paper" aria-label={`${crewLabel[c]}: ${d.crewFit[c]} out of 5`}>
            <div className="h-full rounded-full bg-blue" style={{ width: `${d.crewFit[c] * 20}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
