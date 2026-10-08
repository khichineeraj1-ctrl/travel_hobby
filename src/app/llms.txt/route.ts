import { allNotes } from '@/lib/notes';
import { getAllDestinations } from '@/lib/repo';
import { abs, SITE_NAME } from '@/lib/seo';

export const dynamic = 'force-dynamic';

/** llms.txt — a plain map of the site for AI assistants and answer engines. */
export function GET() {
  const lines = [
    `# ${SITE_NAME}`,
    '',
    '> Offbeat and less-crowded places in India, matched to travel time, season, budget and group. First-hand field notes, full destination guides, and top-rated hidden gems in every state.',
    '',
    '## Field notes (first-hand, with our own photos)',
    ...allNotes().map((n) => `- [${n.shortName}](${abs(`/notes/${n.slug}`)}): ${n.description}`),
    '',
    '## Key pages',
    `- [Explore & search](${abs('/explore')}): search every guide and hidden gem by state, month and type`,
    `- [Hidden gems in every state](${abs('/hidden-gems')}): top-rated, uncrowded spots across 36 states & UTs`,
    `- [Best places by month](${abs('/when')})`,
    `- [Events & festivals](${abs('/events')})`,
    `- [Road trips](${abs('/road-trips')})`,
    '',
    '## Destination guides',
    ...getAllDestinations().map((d) => `- [${d.name}, ${d.state}](${abs(`/places/${d.slug}`)}): ${d.hook}`),
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
