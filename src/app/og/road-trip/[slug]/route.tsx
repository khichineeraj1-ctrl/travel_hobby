import { ogCard } from '@/lib/og';
import { readDb } from '@/lib/db';
import { totals } from '@/lib/roadtrips';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const t = readDb().roadTrips.find((x) => x.slug === slug && x.published);
  if (!t) return ogCard({ kicker: 'Road trips', title: 'Beyond Explored' });
  const x = totals(t);
  return ogCard({ kicker: 'Road trip', title: t.title, sub: t.hook, chips: [`${x.days} days`, `${x.km.toLocaleString('en-IN')} km`, t.difficulty], palette: t.palette, image: t.image });
}
