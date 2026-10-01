import { GemCard } from './GemCard';
import { SpotCard } from './SpotList';
import { cardOf } from '@/lib/gemPages';
import type { Spot } from '@/lib/types';

/** Any Google spot/gem → on-site card that opens its own page; OSM-only spots keep the Maps card. */
export function SpotTile({ s, area, note }: { s: Spot & { area?: string }; area?: string; note?: string }) {
  const c = cardOf(s, area);
  return c ? <GemCard g={c} note={note} /> : <SpotCard s={s} note={note} />;
}
