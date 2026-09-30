import { NextResponse } from 'next/server';
import { roll } from '@/lib/engine';
import { parsePlan } from '@/lib/plan';
import { planLookup } from '@/lib/repo';

/** Impromptu mode: weighted-random pick from the best matches → straight to the place page. */
export function GET(req: Request) {
  const url = new URL(req.url);
  const input = parsePlan(url.searchParams, planLookup);
  // sensible "leave this weekend" default if someone hits /roll cold
  if (!url.searchParams.has('days')) input.days = 3;
  const pick = roll(input);
  const dest = pick ? `/places/${pick.destination.slug}?from=${input.from}&rolled=1` : `/plan?from=${input.from}`;
  // Relative Location: behind Railway's proxy req.url is the internal 0.0.0.0:8080 address,
  // so an absolute redirect built from it would send visitors somewhere unreachable.
  return new NextResponse(null, { status: 307, headers: { Location: dest, 'Cache-Control': 'no-store' } });
}

export const dynamic = 'force-dynamic';
