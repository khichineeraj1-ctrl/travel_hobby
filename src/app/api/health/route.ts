import { NextResponse } from 'next/server';
import fs from 'node:fs';
import { DATA_DIR, readDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Railway healthcheck: app is up AND the data volume is readable/writable. */
export function GET() {
  try {
    const db = readDb();
    fs.accessSync(DATA_DIR, fs.constants.W_OK);
    return NextResponse.json({ ok: true, places: db.destinations.length, dataDir: DATA_DIR });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
