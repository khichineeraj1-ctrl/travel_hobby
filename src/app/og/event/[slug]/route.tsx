import { ogCard } from '@/lib/og';
import { readDb } from '@/lib/db';
import { fmtEventDates } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const e = readDb().events.find((x) => x.slug === slug && x.status === 'published');
  if (!e) return ogCard({ kicker: 'Events in India', title: 'Beyond Explored' });
  return ogCard({ kicker: `${e.town}, ${e.state}`, title: e.name, sub: e.hook, chips: [fmtEventDates(e), e.dateStatus === 'confirmed' ? 'Dates confirmed' : 'Dates expected'], palette: ['#3a1c71', '#d76d77'], image: e.image });
}
