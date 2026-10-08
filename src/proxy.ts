import { NextResponse, type NextRequest } from 'next/server';
import { NON_EN, isLang, langForState, withLang } from '@/lib/langs';

/**
 * Language routing.
 * - /hi/places/x → renders /places/x in Hindi (real URLs per language for Google, with hreflang).
 * - First visit (no choice yet): look up the visitor's Indian state from their IP and switch to its language.
 * - Once someone picks a language (toggle), we remember it in a cookie and never auto-switch again.
 * - Crawlers are never redirected; they get each language at its own URL.
 */
const PREFIX = new RegExp(`^/(${NON_EN.join('|')})(?=/|$)`);
const BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|slack|discord|preview|lighthouse|pagespeed|headless/i;
const YEAR = 365 * 24 * 3600;

const geoCache = new Map<string, { lang: string; region?: string; at: number; ok: boolean }>();

async function detect(ip: string): Promise<{ lang: string; region?: string; ok: boolean }> {
  if (!ip || /^(127\.|10\.|192\.168\.|::1|local)/.test(ip)) return { lang: 'en', ok: true };
  const hit = geoCache.get(ip);
  if (hit && Date.now() - hit.at < 24 * 3600e3) return hit;
  const tryOne = async (url: string, pick: (j: Record<string, unknown>) => { country?: string; region?: string }) => {
    const r = await fetch(url, { signal: AbortSignal.timeout(1200), headers: { 'user-agent': 'beyond-explored/1.0' } });
    if (!r.ok) throw new Error(String(r.status));
    return pick(await r.json());
  };
  let g: { country?: string; region?: string } = {};
  let ok = true;
  try {
    g = await tryOne(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, (j) => ({ country: j.country_code as string, region: j.region as string }));
  } catch {
    try { g = await tryOne(`https://ipwho.is/${encodeURIComponent(ip)}`, (j) => ({ country: j.country_code as string, region: j.region as string })); } catch { g = {}; ok = false; }
  }
  const res = { lang: g.country === 'IN' ? langForState(g.region) : 'en', region: g.country === 'IN' ? g.region : undefined, at: Date.now(), ok };
  if (geoCache.size > 5000) geoCache.clear();
  if (ok) geoCache.set(ip, res);
  return res;
}

function pass(req: NextRequest, lang: string, path: string) {
  const h = new Headers(req.headers);
  h.set('x-be-lang', lang);
  h.set('x-be-path', path);
  return h;
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const ua = req.headers.get('user-agent') ?? '';
  const bot = BOT.test(ua);
  const isDoc = req.method === 'GET' && !req.headers.get('rsc') && !req.headers.get('next-router-prefetch') && (req.headers.get('accept') ?? '').includes('text/html');

  // 1) explicit language URL
  const m = pathname.match(PREFIX);
  if (m) {
    const lang = m[1];
    const rest = pathname.slice(lang.length + 1) || '/';
    const url = req.nextUrl.clone();
    url.pathname = rest;
    const res = NextResponse.rewrite(url, { request: { headers: pass(req, lang, rest) } });
    if (!bot && req.cookies.get('be_lang')?.value !== lang) res.cookies.set('be_lang', lang, { path: '/', maxAge: YEAR, sameSite: 'lax' });
    return res;
  }

  // 2) remembered language
  const saved = req.cookies.get('be_lang')?.value;
  if (saved && isLang(saved)) {
    if (saved !== 'en' && !bot) {
      if (isDoc) return NextResponse.redirect(new URL(withLang(saved, pathname) + search, req.url), 307);
      return NextResponse.next({ request: { headers: pass(req, saved, pathname) } }); // client navigations, form posts
    }
    return NextResponse.next({ request: { headers: pass(req, 'en', pathname) } });
  }

  // 3) first visit: detect from IP (people only, page loads only)
  if (!bot && isDoc && process.env.LANG_AUTODETECT !== 'off') {
    const ip = (req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || '').trim();
    const { lang, region, ok } = await detect(ip);
    const res = lang !== 'en'
      ? NextResponse.redirect(new URL(withLang(lang, pathname) + search, req.url), 307)
      : NextResponse.next({ request: { headers: pass(req, 'en', pathname) } });
    if (ok) res.cookies.set('be_lang', lang, { path: '/', maxAge: YEAR, sameSite: 'lax' }); // lookup failed → try again next visit
    if (lang !== 'en') res.cookies.set('be_auto', region ?? '1', { path: '/', maxAge: YEAR, sameSite: 'lax' });
    return res;
  }
  return NextResponse.next({ request: { headers: pass(req, 'en', pathname) } });
}

export const config = {
  matcher: ['/((?!api|_next|media|og|admin|studio|opengraph-image|icon|.*\\..*).*)'],
};
