import { NextResponse } from 'next/server';
import { getAllDestinations } from '@/lib/repo';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(
    getAllDestinations().map(({ slug, name, state, lat, lng, vibes, bestMonths, crowd }) => ({
      slug, name, state, lat, lng, vibes, bestMonths, crowd, url: `/places/${slug}`,
    })),
  );
}
