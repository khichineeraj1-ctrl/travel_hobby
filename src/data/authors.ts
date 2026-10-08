import type { Author } from '@/lib/types';

/** Seeded once into the DB; after that it's edited in Admin → Authors. */
export const DEFAULT_AUTHOR: Author = {
  slug: 'beyond-explored-team',
  name: 'Beyond Explored Team',
  kind: 'Organization',
  role: 'Travel writers & trip planners',
  bio: 'We’re a small team of Indian travellers who would rather be on a mountain road than in a mall. We go to the places we write about, take our own photos, and come back with the details brochures leave out — which gate opens when, where the locals eat, what the catch is.\n\nEvery field note on this site starts with a real trip. Before we publish, we check dates, timings and rules against official sources, and we say clearly when something is our opinion or needs confirming.',
  expertise: ['Offbeat & less-crowded places in India', 'National parks & jungle safaris', 'Road trips', 'Timing trips around seasons and opening dates'],
  regions: ['Uttarakhand — Jim Corbett, Ramnagar'],
  since: '2026',
  standards: 'First-hand only: we write about places we have visited, and say when we visited.\nFacts checked: opening dates, timings and booking rules are checked against official sources, with the date we checked.\nOur own photos: no stock images on field notes. We don’t show children’s faces or number plates.\nCorrections: if something has changed, tell us and we update the page and its “facts checked” date.',
  links: [],
};
