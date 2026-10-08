import { NextResponse } from 'next/server';
import { isLang, withLang } from '@/lib/langs';
import { abs } from '@/lib/seo';

export const dynamic = 'force-dynamic';

/** Language toggle: remember the choice (stops auto-detect) and go to the same page in that language. */
export function GET(req: Request) {
  const u = new URL(req.url);
  const l = u.searchParams.get('l');
  let next = u.searchParams.get('next') || '/';
  if (!next.startsWith('/') || next.startsWith('//')) next = '/';
  next = next.replace(/^\/(hi|bn|mr|te|ta|gu|kn|ml|pa|or|as)(?=\/|$)/, '') || '/';
  const lang = isLang(l) ? l : 'en';
  const res = NextResponse.redirect(abs(withLang(lang, next)), 303);
  res.cookies.set('be_lang', lang, { path: '/', maxAge: 365 * 24 * 3600, sameSite: 'lax' });
  res.cookies.delete('be_auto');
  return res;
}
