import { ogCard } from '@/lib/og';
import { getDestination } from '@/lib/repo';
import { monthLabel } from '@/lib/months';
import { inr } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const d = getDestination((await params).slug);
  if (!d) return ogCard({ kicker: 'Offbeat India', title: 'Beyond Explored' });
  return ogCard({
    kicker: `${d.state} · ${d.altitudeM.toLocaleString('en-IN')} m`,
    title: d.name,
    sub: d.hook,
    chips: [`Best: ${d.bestMonths.slice(0, 3).map((m) => monthLabel(m).slice(0, 3)).join(', ')}`, `From ${inr(d.budgetPerDay[0])}/day`, `Crowd ${d.crowd}/5`],
    palette: d.palette,
    image: d.image,
  });
}
