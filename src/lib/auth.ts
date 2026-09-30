/**
 * Minimal single-admin auth.
 * - Password comes from ADMIN_PASSWORD (.env.local). Dev fallback: "bhatko-admin" (shown as a warning on the login page).
 * - Session = HMAC-signed, httpOnly cookie valid for 7 days.
 */
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const COOKIE = 'bhatko_admin';
const TTL_MS = 7 * 24 * 3600 * 1000;
export const DEV_PASSWORD = 'bhatko-admin';

export const usingDevPassword = () => !process.env.ADMIN_PASSWORD;
const password = () => process.env.ADMIN_PASSWORD || DEV_PASSWORD;
const secret = () => process.env.ADMIN_SECRET || `bhatko::${password()}`;

const sign = (payload: string) => crypto.createHmac('sha256', secret()).update(payload).digest('base64url');

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export function checkPassword(input: string) {
  const a = crypto.createHash('sha256').update(input).digest('hex');
  const b = crypto.createHash('sha256').update(password()).digest('hex');
  return safeEqual(a, b);
}

export async function startSession() {
  const exp = String(Date.now() + TTL_MS);
  (await cookies()).set(COOKIE, `${exp}.${sign(exp)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.INSECURE_COOKIES !== '1',
    path: '/',
    maxAge: TTL_MS / 1000,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin() {
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) return false;
  const [exp, sig] = v.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, sign(exp));
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect('/admin/login');
}
