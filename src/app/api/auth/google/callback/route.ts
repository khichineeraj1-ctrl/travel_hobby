import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { abs } from '@/lib/seo';
import { readDb, updateDb } from '@/lib/db';
import { createAccount, startContribSession, unseal } from '@/lib/contrib';

export const dynamic = 'force-dynamic';

const fail = (code: string) => NextResponse.redirect(abs(`/contribute?err=${code}`));

/** Step 2: Google sends us back with a code → verify → sign in (invite / approved application / existing account only). */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const jar = await cookies();
  const st = unseal<{ state: string; nonce: string; invite?: string; exp: number }>(jar.get('be_oauth')?.value);
  jar.delete('be_oauth');
  if (!st || st.exp < Date.now() || st.state !== u.searchParams.get('state')) return fail('expired');
  const code = u.searchParams.get('code');
  if (!code) return fail('cancelled');

  // exchange the code directly with Google over TLS — the id_token in this response is trustworthy
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: abs('/api/auth/google/callback'), grant_type: 'authorization_code',
    }),
  }).catch(() => null);
  if (!r?.ok) return fail('google');
  const { id_token } = (await r.json()) as { id_token?: string };
  const claims = id_token ? JSON.parse(Buffer.from(id_token.split('.')[1], 'base64url').toString()) : null;
  if (
    !claims || claims.aud !== process.env.GOOGLE_CLIENT_ID || !['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss) ||
    claims.exp * 1000 < Date.now() || claims.nonce !== st.nonce || !claims.email || !claims.email_verified
  ) return fail('google');

  const g = { email: String(claims.email).toLowerCase(), sub: String(claims.sub), name: String(claims.name ?? ''), picture: claims.picture as string | undefined };
  const db = readDb();
  let account = (db.accounts ?? []).find((a) => a.googleSub === g.sub || a.email === g.email);
  if (account?.status === 'suspended') return fail('suspended');

  if (!account) {
    const inv = st.invite ? (db.invites ?? []).find((i) => i.token === st.invite) : undefined;
    const app = (db.applications ?? []).find((a) => a.email.toLowerCase() === g.email && a.status === 'approved');
    if (inv && !inv.usedBy && new Date(inv.expiresAt) > new Date()) {
      account = createAccount(g, 'invite');
      const id = account.id;
      updateDb((d) => { const i = (d.invites ?? []).find((x) => x.token === inv.token); if (i) { i.usedBy = id; i.usedAt = new Date().toISOString(); } });
    } else if (app) {
      account = createAccount(g, 'application');
    } else {
      return fail(inv ? 'invite-used' : 'not-invited');
    }
  }
  const id = account.id;
  updateDb((d) => { const a = (d.accounts ?? []).find((x) => x.id === id); if (a) { a.lastLogin = new Date().toISOString(); a.googleSub ??= g.sub; } });
  await startContribSession(id);
  return NextResponse.redirect(abs('/studio'));
}
