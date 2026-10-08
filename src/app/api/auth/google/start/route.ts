import { NextResponse } from 'next/server';
import { abs } from '@/lib/seo';
import { googleConfigured, newId, seal } from '@/lib/contrib';

export const dynamic = 'force-dynamic';

/** Step 1 of Google sign-in: remember where we came from (and any invite), then hand over to Google. */
export function GET(req: Request) {
  if (!googleConfigured()) return NextResponse.redirect(abs('/contribute?err=google-off'));
  const u = new URL(req.url);
  const invite = (u.searchParams.get('invite') ?? '').slice(0, 64) || undefined;
  const state = newId(16);
  const nonce = newId(16);
  const google = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  google.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: abs('/api/auth/google/callback'),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    prompt: 'select_account',
  }).toString();
  const res = NextResponse.redirect(google.toString());
  res.cookies.set('be_oauth', seal({ state, nonce, invite, exp: Date.now() + 10 * 60_000 }), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 600,
  });
  return res;
}
