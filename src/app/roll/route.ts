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
  return NextResponse.redirect(new URL(dest, url.origin), 307);
}

export const dynamic = 'force-dynamic';
