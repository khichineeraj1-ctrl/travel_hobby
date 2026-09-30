import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { updateDb } from '@/lib/db';
import { addSuggestions } from '@/lib/eventIngest';

/**
 * POST /api/events/ingest
 * Authorization: Bearer <EVENTS_INGEST_TOKEN>
 * Body: [{ name, startDate, endDate, town, state, lat, lng, category?, hook?, about?, tips?, sourceUrl?, dateStatus?, destSlug? }, …]
 *   or { events: [...] }
 * Events land in Admin → Events → Suggested for review. Nothing goes live automatically.
 */
export async function POST(req: Request) {
  const token = process.env.EVENTS_INGEST_TOKEN;
  if (!token) return NextResponse.json({ error: 'Ingest disabled: set EVENTS_INGEST_TOKEN in .env.local' }, { status: 503 });
  const got = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const a = Buffer.from(crypto.createHash('sha256').update(got).digest('hex'));
  const b = Buffer.from(crypto.createHash('sha256').update(token).digest('hex'));
  if (!crypto.timingSafeEqual(a, b)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 }); }
  const items = Array.isArray(body) ? body : Array.isArray((body as { events?: unknown[] })?.events) ? (body as { events: unknown[] }).events : null;
  if (!items) return NextResponse.json({ error: 'Send an array of events or { events: [...] }' }, { status: 400 });

  let result = { added: [] as string[], skipped: [] as string[], errors: [] as string[] };
  updateDb((db) => { result = addSuggestions(db, items); });
  revalidatePath('/admin', 'layout');
  return NextResponse.json(result, { status: result.added.length ? 201 : 200 });
}
