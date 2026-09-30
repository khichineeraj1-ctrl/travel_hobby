import { suggest } from '../src/lib/engine';
import { estimateTravel } from '../src/lib/travel';
import { cityBySlug } from '../src/lib/repo';
import { getAllDestinations } from '../src/lib/repo';
import { hrs } from '../src/lib/format';

for (const from of ['delhi', 'mumbai', 'bengaluru', 'kolkata']) {
  const res = suggest({ from, days: 3, budget: 2000, crew: 'squad', month: 10, vibes: [] }, 5);
  console.log(`\n${from} · 3 days · Oct`);
  res.forEach((s) => console.log(`  ${s.score}  ${s.destination.name.padEnd(16)} ${hrs(s.travel.fastest.hours).padEnd(8)} ${s.travel.fastest.mode}  ${s.warnings.join(' | ')}`));
}
const delhi = cityBySlug('delhi')!;
console.log('\nDelhi → all:');
for (const d of getAllDestinations()) {
  const t = estimateTravel(delhi, d);
  console.log(`  ${d.name.padEnd(16)} ${t.options.map((o) => `${o.mode}:${hrs(o.hours)}`).join('  ')}`);
}
