/**
 * Contributor accounts: Google sign-in, invite links, applications, and a signed session cookie.
 * Contributors can only write drafts and submit them; an admin reviews and publishes.
 */
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { readDb, updateDb } from './db';
import type { Account, Author } from './types';

const COOKIE = 'be_contrib';
const TTL_MS = 30 * 24 * 3600 * 1000;
const secret = () => `${process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || 'bhatko'}::contrib`;
const sign = (v: string) => crypto.createHmac('sha256', secret()).update(v).digest('base64url');
const safeEqual = (a: string, b: string) => {
  const ba = Buffer.from(a), bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

/** Signed, tamper-proof small payloads (used for the session and the OAuth state cookie). */
export function seal(obj: object) {
  const v = Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${v}.${sign(v)}`;
}
export function unseal<T>(raw?: string): T | null {
  if (!raw) return null;
  const [v, s] = raw.split('.');
  if (!v || !s || !safeEqual(s, sign(v))) return null;
  try { return JSON.parse(Buffer.from(v, 'base64url').toString()) as T; } catch { return null; }
}

const secure = () => process.env.NODE_ENV === 'production' && process.env.INSECURE_COOKIES !== '1';

export async function startContribSession(accountId: string) {
  (await cookies()).set(COOKIE, seal({ id: accountId, exp: Date.now() + TTL_MS }), {
    httpOnly: true, sameSite: 'lax', secure: secure(), path: '/', maxAge: TTL_MS / 1000,
  });
}
export async function endContribSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentAccount(): Promise<Account | null> {
  const s = unseal<{ id: string; exp: number }>((await cookies()).get(COOKIE)?.value);
  if (!s || s.exp < Date.now()) return null;
  const a = (readDb().accounts ?? []).find((x) => x.id === s.id);
  return a && a.status === 'active' ? a : null;
}

export async function requireAccount(): Promise<Account> {
  const a = await currentAccount();
  if (!a) redirect('/contribute?err=signin');
  return a;
}

export const googleConfigured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const newId = (n = 9) => crypto.randomBytes(n).toString('base64url');

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'writer';

/** Create (or re-link) the account + a starter author profile for a Google user. */
export function createAccount(g: { email: string; sub: string; name: string; picture?: string }, via: Account['via']): Account {
  let account!: Account;
  updateDb((db) => {
    db.accounts ??= [];
    db.authors ??= [];
    const existing = db.accounts.find((a) => a.email === g.email);
    if (existing) { account = existing; return; }
    let slug = slugify(g.name || g.email.split('@')[0]);
    while (db.authors.some((a) => a.slug === slug)) slug = `${slug}-${crypto.randomBytes(2).toString('hex')}`;
    const author: Author = {
      slug, name: g.name || g.email.split('@')[0], kind: 'Person', role: 'Contributor',
      bio: '', expertise: [], regions: [], links: [], since: String(new Date().getFullYear()),
    };
    db.authors.push(author);
    account = { id: newId(), email: g.email, googleSub: g.sub, name: author.name, picture: g.picture, authorSlug: slug, status: 'active', createdAt: new Date().toISOString(), via };
    db.accounts.push(account);
  });
  return account;
}
