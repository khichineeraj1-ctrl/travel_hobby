'use server';

import { headers } from 'next/headers';
import { updateDb, readDb } from '@/lib/db';
import { rateLimited, validEmail } from '@/lib/booking';
import { newId } from '@/lib/contrib';

export type ApplyState = { ok?: boolean; message?: string; errors?: Record<string, string> };

export async function applyToWrite(_: ApplyState, fd: FormData): Promise<ApplyState> {
  const s = (k: string, n = 1000) => String(fd.get(k) ?? '').trim().slice(0, n);
  if (s('website')) return { ok: true, message: 'Thanks!' }; // honeypot
  const h = await headers();
  const ip = (h.get('x-forwarded-for')?.split(',')[0] || 'local').trim();
  if (rateLimited(`apply:${ip}`, 4, 60 * 60 * 1000)) return { message: 'Too many applications from here — try again later.' };
  const errors: Record<string, string> = {};
  const name = s('name', 80), email = s('email', 120).toLowerCase(), places = s('places'), pitch = s('pitch', 1500), sample = s('sample', 300);
  if (!name) errors.name = 'Your name, please.';
  if (!validEmail(email)) errors.email = 'Use the Gmail/Google email you’ll sign in with.';
  if (places.length < 20) errors.places = 'Tell us a few places you’ve actually been.';
  if (pitch.length < 60) errors.pitch = 'A couple of sentences about what you’d write.';
  if (sample && !/^https:\/\/\S+$/.test(sample)) errors.sample = 'Paste a full https:// link.';
  if (fd.get('consent') !== 'on') errors.consent = 'Please tick this so we can contact you.';
  if (Object.keys(errors).length) return { errors };
  if ((readDb().applications ?? []).some((a) => a.email === email && a.status === 'new')) return { ok: true, message: 'We already have your application — we’ll be in touch.' };
  updateDb((db) => {
    db.applications ??= [];
    db.applications.push({ id: newId(), name, email, phone: s('phone', 20) || undefined, places, sample: sample || undefined, pitch, createdAt: new Date().toISOString(), status: 'new' });
  });
  return { ok: true, message: 'Thanks! We read every application. If it’s a fit, you’ll be able to sign in here with Google using that email.' };
}
