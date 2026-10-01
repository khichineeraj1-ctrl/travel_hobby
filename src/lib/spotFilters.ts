import type { Spot } from './types';

/** Type filters shared by /spots and the hidden-gem pages. */
export const SPOT_FILTERS = [
  { id: 'all', label: 'Everything', test: () => true },
  { id: 'gems', label: '💎 Hidden gems', test: (s: Spot) => !!s.gem },
  { id: 'water', label: '💧 Water', test: (s: Spot) => /water|lake|river|beach|spring|dam/i.test(`${s.kind} ${s.name}`) },
  { id: 'views', label: '🔭 Views & peaks', test: (s: Spot) => /view|peak|point|top|pass|glacier|observ/i.test(`${s.kind} ${s.name}`) },
  { id: 'wild', label: '🌳 Nature & treks', test: (s: Spot) => /park|reserve|forest|sanctuary|hik|trek|trail|cave|garden/i.test(`${s.kind} ${s.name}`) },
  { id: 'heritage', label: '🏛️ Heritage', test: (s: Spot) => /fort|palace|ruin|archae|monument|museum|temple|monaster|gompa|church|mosque|historic|shrine/i.test(`${s.kind} ${s.name}`) },
];
