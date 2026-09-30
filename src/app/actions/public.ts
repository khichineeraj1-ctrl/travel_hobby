'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { readDb, updateDb } from '@/lib/db';
import {
  bookingRef, isIsoDate, leadId, nights, normalizePhone, rateLimited, roomsLeft, seatsLeft, secretKey, todayIST, validEmail,
} from '@/lib/booking';
import type { Booking, BookingKind, Lead, LeadKind } from '@/lib/types';

export type FormState = { ok?: boolean; message?: string; errors?: Record<string, string> };

const str = (fd: FormData, k: string, max = 500) => String(fd.get(k) ?? '').trim().slice(0, max);
const now = () => new Date().toISOString();

async function clientKey() {
  const h = await headers();
  return (h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || 'local').trim();
}

/* ---------------- leads ---------------- */

const LEAD_FIELDS: Record<LeadKind, string[]> = {
  enquiry: ['place', 'when', 'days', 'groupSize', 'crew', 'budget', 'from', 'message'],
  newsletter: ['channel'],
  partner: ['business', 'partnerType', 'location', 'capacity', 'link', 'message'],
  dropoff: ['item', 'itemName', 'dates', 'guests'],
  event: ['eventSlug', 'eventName', 'eventDates', 'from', 'groupSize', 'wants'],
};

export async function submitLead(_prev: FormState, fd: FormData): Promise<FormState> {
  if (str(fd, 'website')) return { ok: true, message: 'Thanks!' }; // honeypot: bots fill hidden fields
  const kind = str(fd, 'kind') as LeadKind;
  if (!['enquiry', 'newsletter', 'partner', 'event'].includes(kind)) return { message: 'Unknown form.' };
  if (rateLimited(`lead:${await clientKey()}`)) return { message: 'Too many submissions — try again in a few minutes.' };

  const errors: Record<string, string> = {};
  const name = str(fd, 'name', 80);
  const rawPhone = str(fd, 'phone', 20);
  const email = str(fd, 'email', 120).toLowerCase();
  const phone = rawPhone ? normalizePhone(rawPhone) : null;

  const lite = kind === 'newsletter' || kind === 'event';
  if (!lite && !name) errors.name = 'Tell us your name.';
  if (lite) {
    if (!email && !rawPhone) errors.email = 'Add an email or WhatsApp number.';
  } else if (!rawPhone) errors.phone = 'We need a number to reach you.';
  if (rawPhone && !phone) errors.phone = 'That doesn’t look like a valid mobile number.';
  if (email && !validEmail(email)) errors.email = 'That email doesn’t look right.';
  if (kind === 'partner' && !str(fd, 'business')) errors.business = 'Business or property name, please.';
  if (fd.get('consent') !== 'on') errors.consent = 'Please tick the box so we’re allowed to contact you.';
  if (Object.keys(errors).length) return { errors, message: 'Please fix the highlighted fields.' };

  const data: Record<string, string> = {};
  for (const k of LEAD_FIELDS[kind]) { const v = str(fd, k, 1000); if (v) data[k] = v; }

  updateDb((db) => {
    // newsletter: don't duplicate the same contact
    const same = (l: Lead) => (email && l.email === email) || (phone && l.phone === phone);
    if (kind === 'newsletter' && db.leads.some((l) => l.kind === 'newsletter' && same(l))) return;
    if (kind === 'event' && db.leads.some((l) => l.kind === 'event' && l.data.eventSlug === data.eventSlug && same(l))) return;
    const lead: Lead = {
      id: leadId(), kind, status: 'new', createdAt: now(), updatedAt: now(),
      name: name || undefined, phone: phone ?? undefined, email: email || undefined, data, source: str(fd, 'source', 200) || undefined,
    };
    db.leads.unshift(lead);
  });

  const msg = {
    enquiry: 'Got it! A real human will WhatsApp you within 24 hours with ideas.',
    newsletter: 'You’re in. First drop lands soon.',
    partner: 'Thanks! We’ll review and get in touch within a few days.',
    event: 'Done. We’ll ping you with plans, stays and any date changes.',
  }[kind as 'enquiry' | 'newsletter' | 'partner' | 'event'];
  return { ok: true, message: msg };
}

/** Called from checkout as soon as we have a name + phone, so abandoned bookings can be followed up. */
export async function captureDropoff(input: { name: string; phone: string; email?: string; item: string; itemName: string; dates?: string; guests?: string; source?: string }) {
  const phone = normalizePhone(input.phone ?? '');
  if (!phone || !input.name?.trim()) return { ok: false as const };
  if (rateLimited(`drop:${await clientKey()}`, 30)) return { ok: false as const };
  let id = '';
  updateDb((db) => {
    const dayAgo = new Date(Date.now() - 86400000).toISOString();
    const existing = db.leads.find((l) => l.kind === 'dropoff' && l.phone === phone && l.data.item === input.item && l.createdAt > dayAgo && l.status !== 'converted');
    const data = { item: input.item, itemName: input.itemName, ...(input.dates ? { dates: input.dates } : {}), ...(input.guests ? { guests: input.guests } : {}) };
    if (existing) {
      Object.assign(existing, { name: input.name.trim().slice(0, 80), email: input.email?.trim() || existing.email, data: { ...existing.data, ...data }, updatedAt: now() });
      id = existing.id;
    } else {
      id = leadId();
      db.leads.unshift({ id, kind: 'dropoff', status: 'new', createdAt: now(), updatedAt: now(), name: input.name.trim().slice(0, 80), phone, email: input.email?.trim() || undefined, data, source: input.source });
    }
  });
  return { ok: true as const, leadId: id };
}

/* ---------------- bookings ---------------- */

export async function createBooking(_prev: FormState, fd: FormData): Promise<FormState> {
  if (str(fd, 'website')) return { message: 'Something went wrong.' };
  if (rateLimited(`book:${await clientKey()}`, 8)) return { message: 'Too many attempts — try again in a few minutes.' };

  const kind = str(fd, 'kind') as BookingKind;
  const errors: Record<string, string> = {};
  const name = str(fd, 'name', 80);
  const phone = normalizePhone(str(fd, 'phone', 20));
  const email = str(fd, 'email', 120).toLowerCase();
  const guests = Math.round(Number(str(fd, 'guests')) || 0);

  if (!name) errors.name = 'Your name, please.';
  if (!phone) errors.phone = 'A valid mobile number is required.';
  if (email && !validEmail(email)) errors.email = 'That email doesn’t look right.';
  if (guests < 1 || guests > 30) errors.guests = 'Between 1 and 30 travellers.';
  if (fd.get('consent') !== 'on') errors.consent = 'Please accept so we can contact you about this booking.';

  const db = readDb();
  const today = todayIST();
  const base = { name, phone: phone ?? '', email: email || undefined };
  let draft: Omit<Booking, 'id' | 'key' | 'createdAt' | 'updatedAt' | 'status'> | null = null;

  if (kind === 'trip') {
    const dep = db.departures.find((d) => d.id === str(fd, 'departureId') && d.published);
    if (!dep || dep.startDate <= today) return { message: 'This trip is no longer available.' };
    if (!errors.guests && guests > seatsLeft(dep, db.bookings)) errors.guests = `Only ${seatsLeft(dep, db.bookings)} seats left.`;
    draft = { kind, contact: base, destSlug: dep.destSlug, departureId: dep.id, checkIn: dep.startDate, checkOut: dep.endDate, guests, total: dep.pricePerPerson * guests, details: {}, notes: str(fd, 'notes', 1000) || undefined };
  } else if (kind === 'stay') {
    const stay = db.stays.find((s) => s.id === str(fd, 'stayId') && s.published);
    if (!stay) return { message: 'This stay is no longer available.' };
    const checkIn = str(fd, 'checkIn'); const checkOut = str(fd, 'checkOut');
    const rooms = Math.round(Number(str(fd, 'rooms')) || 1);
    if (!isIsoDate(checkIn) || checkIn < today) errors.checkIn = 'Pick a check-in date from today onwards.';
    else if (!isIsoDate(checkOut) || nights(checkIn, checkOut) < 1) errors.checkOut = 'Check-out must be after check-in.';
    else if (nights(checkIn, checkOut) > 30) errors.checkOut = 'Max 30 nights per booking.';
    else {
      const left = roomsLeft(stay, checkIn, checkOut, db.bookings);
      if (rooms > left) errors.rooms = left ? `Only ${left} room${left > 1 ? 's' : ''} free for those dates.` : 'Fully booked for those dates.';
    }
    if (!errors.guests && guests > rooms * stay.maxGuestsPerRoom) errors.guests = `Max ${stay.maxGuestsPerRoom} guests per room — add a room.`;
    if (!errors.checkIn && !errors.checkOut)
      draft = { kind, contact: base, destSlug: stay.destSlug, stayId: stay.id, checkIn, checkOut, rooms, guests, total: stay.pricePerNight * rooms * nights(checkIn, checkOut), details: {}, notes: str(fd, 'notes', 1000) || undefined };
  } else if (kind === 'custom') {
    const destSlug = str(fd, 'destSlug');
    const place = str(fd, 'placeText', 120);
    if (!destSlug && !place) errors.destSlug = 'Pick a place, or tell us what you have in mind.';
    const checkIn = str(fd, 'checkIn'); const checkOut = str(fd, 'checkOut');
    const flexible = str(fd, 'flexibleWhen', 120);
    if (!flexible && !(isIsoDate(checkIn) && isIsoDate(checkOut) && nights(checkIn, checkOut) >= 0 && checkIn >= today)) errors.checkIn = 'Add dates, or tell us roughly when.';
    const details: Record<string, string> = {};
    for (const k of ['event', 'eventDates', 'roadTrip', 'placeText', 'flexibleWhen', 'from', 'crew', 'budget', 'stayStyle', 'interests']) { const v = str(fd, k, 500); if (v) details[k] = v; }
    draft = { kind, contact: base, destSlug: destSlug || undefined, checkIn: isIsoDate(checkIn) ? checkIn : undefined, checkOut: isIsoDate(checkOut) ? checkOut : undefined, guests, details, notes: str(fd, 'notes', 1500) || undefined };
  } else {
    return { message: 'Unknown booking type.' };
  }

  if (Object.keys(errors).length || !draft) return { errors, message: 'Please fix the highlighted fields.' };

  // write — re-check capacity inside the write so two people can't grab the last seat
  let created: Booking | null = null;
  let conflict = '';
  updateDb((db) => {
    if (draft!.kind === 'trip') {
      const dep = db.departures.find((d) => d.id === draft!.departureId)!;
      if (draft!.guests > seatsLeft(dep, db.bookings)) { conflict = 'Those seats were just taken — please try fewer travellers.'; return; }
    }
    if (draft!.kind === 'stay') {
      const stay = db.stays.find((s) => s.id === draft!.stayId)!;
      if ((draft!.rooms ?? 1) > roomsLeft(stay, draft!.checkIn!, draft!.checkOut!, db.bookings)) { conflict = 'Those rooms were just booked — try other dates.'; return; }
    }
    const b: Booking = {
      ...draft!, id: bookingRef(new Set(db.bookings.map((x) => x.id))), key: secretKey(),
      status: 'pending', createdAt: now(), updatedAt: now(), source: str(fd, 'source', 200) || undefined,
    };
    db.bookings.unshift(b);
    // a drop-off lead for this person/item is now converted
    const dropId = str(fd, 'dropoffLeadId', 40);
    const drop = db.leads.find((l) => l.kind === 'dropoff' && (l.id === dropId || (l.phone === b.contact.phone && l.status !== 'converted' && l.data.item === (b.departureId ?? b.stayId ?? 'custom'))));
    if (drop) { drop.status = 'converted'; drop.bookingId = b.id; drop.updatedAt = now(); }
    created = b;
  });
  if (conflict) return { message: conflict };
  const b = created as Booking | null;
  if (!b) return { message: 'Could not save your booking. Please try again.' };
  revalidatePath('/', 'layout'); // seats-left counters
  redirect(`/booking/${b.id}?key=${b.key}`);
}

/** live availability for the stay checkout */
export async function checkStay(stayId: string, checkIn: string, checkOut: string) {
  const db = readDb();
  const stay = db.stays.find((s) => s.id === stayId && s.published);
  if (!stay || !isIsoDate(checkIn) || !isIsoDate(checkOut) || nights(checkIn, checkOut) < 1 || checkIn < todayIST()) return { roomsLeft: 0, nights: 0 };
  return { roomsLeft: roomsLeft(stay, checkIn, checkOut, db.bookings), nights: nights(checkIn, checkOut) };
}
