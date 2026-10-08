import { NextResponse } from 'next/server';
import { search } from '@/lib/catalog';
import { monthLabel } from '@/lib/months';
import { INDIA_STATES } from '@/lib/gems';

export const dynamic = 'force-dynamic';

/** Type-ahead for the home search box: top matches + what we understood from the query. */
export function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get('q') ?? '').slice(0, 120);
  if (q.trim().length < 2) return NextResponse.json({ items: [], understood: [] });
  const { items, parsed } = search({ q });
  const understood = [
    ...(parsed?.states ?? []).map((s) => INDIA_STATES.find((x) => x.slug === s)?.name ?? s),
    ...(parsed?.month ? [monthLabel(parsed.month)] : []),
    ...(parsed?.type ? [parsed.type] : []),
  ];
  return NextResponse.json({
    total: items.length,
    understood,
    items: items.slice(0, 7).map((it) => ({
      name: it.name, href: it.href, external: it.external, kind: it.kind,
      sub: it.kind === 'note' ? `Field notes · our own trip · ${it.stateName}` : it.kind === 'guide' ? `Full guide · ${it.stateName}` : `${it.label} · ${it.area ?? it.stateName}${it.rating ? ` · ★ ${it.rating.toFixed(1)}` : ''}`,
    })),
  }, { headers: { 'Cache-Control': 'public, max-age=60' } });
}
