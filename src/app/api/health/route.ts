import { NextResponse } from 'next/server';
import fs from 'node:fs';
import { DATA_DIR, readDb } from '@/lib/db';
import { spotProvider } from '@/lib/places';
import { isSandbox, ratesEnabled } from '@/lib/rates';

export const dynamic = 'force-dynamic';

/** Railway healthcheck: app is up AND the data volume is readable/writable. */
export function GET() {
  try {
    const db = readDb();
    fs.accessSync(DATA_DIR, fs.constants.W_OK);
    const spots = Object.values(db.spots ?? {});
    return NextResponse.json({
      ok: true, places: db.destinations.length, dataDir: DATA_DIR,
      spots: { places: spots.filter((s) => s.spots.length).length, total: spots.reduce((n, s) => n + s.spots.length, 0), provider: spotProvider(), last: db.spotMeta ?? null },
      stayRates: { enabled: ratesEnabled(), sandbox: ratesEnabled() ? isSandbox() : undefined, places: Object.values(db.stayRates ?? {}).filter((r) => r.count > 0).length, last: db.rateMeta ?? null },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
