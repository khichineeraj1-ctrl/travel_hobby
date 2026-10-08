import { NextResponse } from 'next/server';
import { rateLimited } from '@/lib/booking';
import { enqueue, i18nEnabled, lookup } from '@/lib/i18n';
import { isLang } from '@/lib/langs';

export const dynamic = 'force-dynamic';

/** Page asks: "translations for these strings?" → hits now, misses queued for background translation. */
export async function POST(req: Request) {
  const ip = (req.headers.get('x-forwarded-for')?.split(',')[0] || 'local').trim();
  if (rateLimited(`i18n:${ip}`, 90, 60_000)) return NextResponse.json({ t: {}, pending: 0 }, { status: 429 });
  const body = await req.json().catch(() => null) as { lang?: string; keys?: unknown } | null;
  if (!body || !isLang(body.lang) || body.lang === 'en' || !Array.isArray(body.keys)) return NextResponse.json({ t: {}, pending: 0 });
  const keys = [...new Set(body.keys.filter((k): k is string => typeof k === 'string' && k.length > 0 && k.length <= 3000))].slice(0, 600);
  const { hits, misses } = lookup(body.lang, keys);
  // only queue things that look like real text (has letters), to keep costs honest
  const queued = i18nEnabled() ? enqueue(body.lang, misses.filter((k) => /[A-Za-z]{2}/.test(k))) : 0;
  return NextResponse.json({ t: hits, pending: i18nEnabled() ? misses.length : 0, enabled: i18nEnabled() });
  void queued;
}
