import { ogCard, OG_SIZE } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Beyond Explored — offbeat India, zero itinerary';

export default function Image() {
  return ogCard({ kicker: 'Offbeat India', title: 'Places nobody’s posted yet.', sub: 'Real travel times, live weather, honest costs and the best month to go — solo, squad or family.', chips: ['Hidden places', 'Events', 'Road trips'] });
}
