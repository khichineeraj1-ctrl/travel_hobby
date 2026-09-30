import { NextResponse } from 'next/server';
import { suggest, roll } from '@/lib/engine';
import { parsePlan } from '@/lib/plan';
import { planLookup } from '@/lib/repo';

/**
 * GET /api/suggest?from=delhi&days=3&budget=2000&crew=solo&month=10&vibes=touch-grass,soft-life&maxCrowd=3
 * GET /api/suggest?...&roll=1   → one weighted-random impromptu pick
 */
export function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const input = parsePlan(params, planLookup);
  const slim = (s: ReturnType<typeof suggest>[number]) => ({
    slug: s.destination.slug,
    name: s.destination.name,
    state: s.destination.state,
    hook: s.destination.hook,
    score: s.score,
    travel: s.travel,
    hoursOnGround: s.hoursOnGround,
    reasons: s.reasons,
    warnings: s.warnings,
    url: `/places/${s.destination.slug}?from=${input.from}`,
  });

  if (params.get('roll')) {
    const pick = roll(input);
    return NextResponse.json({ input, pick: pick ? slim(pick) : null });
  }
  return NextResponse.json({ input, results: suggest(input, 12).map(slim) });
}
