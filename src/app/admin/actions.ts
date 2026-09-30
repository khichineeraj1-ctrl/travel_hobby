'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { checkPassword, endSession, requireAdmin, startSession } from '@/lib/auth';
import { readDb, updateDb, UPLOAD_DIR } from '@/lib/db';
import type { Crew, Destination, EventCategory, Hub, Month, OriginCity, RoadStop, Signal, Terrain, Vibe } from '@/lib/types';
import { addSuggestions } from '@/lib/eventIngest';
import { refreshRoutes, refreshRoutesInBackground } from '@/lib/routing';

/* ---------- helpers ---------- */

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const num = (fd: FormData, k: string, fallback = 0) => {
  const n = Number(str(fd, k));
  return Number.isFinite(n) && str(fd, k) !== '' ? n : fallback;
};
const lines = (fd: FormData, k: string) => str(fd, k).split('\n').map((s) => s.trim()).filter(Boolean);
const months = (fd: FormData, k: string) =>
  fd.getAll(k).map(Number).filter((m) => m >= 1 && m <= 12).sort((a, b) => a - b) as Month[];
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const five = (n: number) => clamp(Math.round(n), 1, 5) as 1 | 2 | 3 | 4 | 5;
const slug = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const hub = (fd: FormData, prefix: string): Hub | null => {
  const name = str(fd, `${prefix}Name`);
  if (!name) return null;
  return { name, lat: num(fd, `${prefix}Lat`), lng: num(fd, `${prefix}Lng`) };
};

const IMAGE_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };

async function saveUpload(fd: FormData, field: string, base: string): Promise<string | null> {
  const f = fd.get(field);
  if (!f || typeof f === 'string' || f.size === 0) return null;
  const ext = IMAGE_EXT[f.type];
  if (!ext) throw new Error('Photo must be JPG, PNG, WebP or AVIF.');
  if (f.size > 8 * 1024 * 1024) throw new Error('Photo must be under 8 MB.');
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${slug(base)}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await f.arrayBuffer()));
  return `/media/${name}`;
}

async function removeUpload(url?: string) {
  if (!url?.startsWith('/media/')) return;
  await fs.unlink(path.join(UPLOAD_DIR, path.basename(url))).catch(() => {});
}

const refresh = () => revalidatePath('/', 'layout');
const back = (to: string, msg: string, kind: 'ok' | 'err' = 'ok') =>
  redirect(`${to}${to.includes('?') ? '&' : '?'}${kind}=${encodeURIComponent(msg)}`);

/* ---------- auth ---------- */

export async function login(fd: FormData) {
  if (!checkPassword(str(fd, 'password'))) redirect('/admin/login?err=1');
  await startSession();
  redirect('/admin');
}

export async function logout() {
  await endSession();
  redirect('/admin/login');
}

/* ---------- destinations ---------- */

export async function saveDestination(fd: FormData) {
  await requireAdmin();
  const original = str(fd, 'originalSlug');
  const db = readDb();
  const existing = original ? db.destinations.find((d) => d.slug === original) : undefined;
  if (original && !existing) back('/admin/destinations', 'That place no longer exists.', 'err');

  const name = str(fd, 'name');
  const state = str(fd, 'state');
  if (!name || !state) back(original ? `/admin/destinations/${original}` : '/admin/destinations/new', 'Name and state are required.', 'err');

  const newSlug = existing ? existing.slug : slug(str(fd, 'slug') || `${name}-${state}`);
  if (!existing && db.destinations.some((d) => d.slug === newSlug)) back('/admin/destinations/new', `A place with URL /places/${newSlug} already exists.`, 'err');

  let image = existing?.image;
  try {
    const uploaded = await saveUpload(fd, 'image', newSlug);
    if (uploaded) { await removeUpload(image); image = uploaded; }
    else if (fd.get('removeImage')) { await removeUpload(image); image = undefined; }
  } catch (e) {
    back(original ? `/admin/destinations/${original}` : '/admin/destinations/new', (e as Error).message, 'err');
  }

  const skip = lines(fd, 'skip').map((l) => {
    const [m, ...why] = l.split('|');
    return {
      months: m.split(/[ ,]+/).map(Number).filter((x) => x >= 1 && x <= 12) as Month[],
      why: why.join('|').trim(),
    };
  }).filter((s) => s.months.length && s.why);

  const budgetLo = Math.max(0, num(fd, 'budgetLo', 1000));
  const d: Destination = {
    slug: newSlug,
    name,
    state,
    stateSlug: slug(state),
    lat: num(fd, 'lat'),
    lng: num(fd, 'lng'),
    altitudeM: Math.round(num(fd, 'altitudeM')),
    terrain: (str(fd, 'terrain') || 'hills') as Terrain,
    hook: str(fd, 'hook'),
    about: str(fd, 'about'),
    vibes: fd.getAll('vibes').map(String),
    bestMonths: months(fd, 'bestMonths'),
    okMonths: months(fd, 'okMonths'),
    skip,
    crowd: five(num(fd, 'crowd', 3)),
    budgetPerDay: [budgetLo, Math.max(budgetLo, num(fd, 'budgetHi', budgetLo * 2))],
    crewFit: (['solo', 'duo', 'squad', 'fam'] as Crew[]).reduce(
      (acc, c) => ({ ...acc, [c]: five(num(fd, `crew_${c}`, 3)) }),
      {} as Destination['crewFit'],
    ),
    minDays: clamp(Math.round(num(fd, 'minDays', 2)), 1, 30),
    idealDays: clamp(Math.round(num(fd, 'idealDays', 3)), 1, 30),
    signal: (str(fd, 'signal') || 'patchy') as Signal,
    airport: hub(fd, 'airport'),
    railhead: hub(fd, 'railhead'),
    roadFactor: clamp(num(fd, 'roadFactor', 1.4), 1, 2.5),
    doThis: lines(fd, 'doThis'),
    theIck: lines(fd, 'theIck'),
    stayTypes: lines(fd, 'stayTypes'),
    palette: [str(fd, 'color1') || '#2F5D50', str(fd, 'color2') || '#8FD3FF'],
    image,
    imageCredit: str(fd, 'imageCredit') || undefined,
    published: fd.get('published') === 'on',
    updatedAt: new Date().toISOString(),
  };
  if (d.idealDays < d.minDays) d.idealDays = d.minDays;

  updateDb((db) => {
    const i = db.destinations.findIndex((x) => x.slug === d.slug);
    if (i === -1) db.destinations.push(d);
    else db.destinations[i] = d;
  });
  refresh();
  refreshRoutesInBackground();
  back(`/admin/destinations/${d.slug}`, existing ? 'Saved. The live site is updated.' : 'Place created.');
}

export async function deleteDestination(fd: FormData) {
  await requireAdmin();
  const s = str(fd, 'slug');
  if (fd.get('confirm') !== 'on') back(`/admin/destinations/${s}`, 'Tick the confirmation box to delete.', 'err');
  const d = readDb().destinations.find((x) => x.slug === s);
  await removeUpload(d?.image);
  updateDb((db) => {
    db.destinations = db.destinations.filter((x) => x.slug !== s);
    db.settings.featured = db.settings.featured.filter((x) => x !== s);
  });
  refresh();
  back('/admin/destinations', `Deleted ${d?.name ?? s}.`);
}

export async function togglePublished(fd: FormData) {
  await requireAdmin();
  const s = str(fd, 'slug');
  updateDb((db) => {
    const d = db.destinations.find((x) => x.slug === s);
    if (d) { d.published = d.published === false; d.updatedAt = new Date().toISOString(); }
  });
  refresh();
  back('/admin/destinations', 'Updated.');
}

/* ---------- vibes ---------- */

export async function saveVibe(fd: FormData) {
  await requireAdmin();
  const original = str(fd, 'originalId');
  const label = str(fd, 'label');
  if (!label) back('/admin/vibes', 'Vibe name is required.', 'err');
  const id = original || slug(str(fd, 'id') || label);
  const db = readDb();
  const existing = db.vibes.find((v) => v.id === id);
  if (!original && existing) back('/admin/vibes', `A vibe with id “${id}” already exists.`, 'err');

  let image = existing?.image;
  try {
    const up = await saveUpload(fd, 'image', `vibe-${id}`);
    if (up) { await removeUpload(image); image = up; }
    else if (fd.get('removeImage')) { await removeUpload(image); image = undefined; }
  } catch (e) {
    back('/admin/vibes', (e as Error).message, 'err');
  }

  const v: Vibe = {
    id,
    label,
    emoji: str(fd, 'emoji') || '✨',
    blurb: str(fd, 'blurb'),
    seoTitle: str(fd, 'seoTitle') || `${label} trips in India`,
    image,
  };
  updateDb((db) => {
    const i = db.vibes.findIndex((x) => x.id === id);
    if (i === -1) db.vibes.push(v);
    else db.vibes[i] = v;
  });
  refresh();
  back('/admin/vibes', `Saved “${label}”.`);
}

export async function deleteVibe(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id');
  if (fd.get('confirm') !== 'on') back('/admin/vibes', 'Tick the confirmation box to delete.', 'err');
  const v = readDb().vibes.find((x) => x.id === id);
  await removeUpload(v?.image);
  updateDb((db) => {
    db.vibes = db.vibes.filter((x) => x.id !== id);
    db.destinations.forEach((d) => { d.vibes = d.vibes.filter((x) => x !== id); });
  });
  refresh();
  back('/admin/vibes', `Deleted “${v?.label ?? id}”.`);
}

export async function moveVibe(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id');
  const dir = str(fd, 'dir') === 'up' ? -1 : 1;
  updateDb((db) => {
    const i = db.vibes.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= db.vibes.length) return;
    [db.vibes[i], db.vibes[j]] = [db.vibes[j], db.vibes[i]];
  });
  refresh();
  redirect('/admin/vibes');
}

/* ---------- cities ---------- */

export async function saveCity(fd: FormData) {
  await requireAdmin();
  const original = str(fd, 'originalSlug');
  const name = str(fd, 'name');
  if (!name) back('/admin/cities', 'City name is required.', 'err');
  const s = original || slug(name);
  if (!original && readDb().cities.some((c) => c.slug === s)) back('/admin/cities', `${name} already exists.`, 'err');
  const c: OriginCity = { slug: s, name, lat: num(fd, 'lat'), lng: num(fd, 'lng'), hasAirport: fd.get('hasAirport') === 'on' };
  if (!c.lat || !c.lng) back('/admin/cities', 'Latitude and longitude are required (used for travel times).', 'err');
  updateDb((db) => {
    const i = db.cities.findIndex((x) => x.slug === s);
    if (i === -1) db.cities.push(c);
    else db.cities[i] = c;
  });
  refresh();
  refreshRoutesInBackground();
  back('/admin/cities', `Saved ${name}.`);
}

export async function deleteCity(fd: FormData) {
  await requireAdmin();
  const s = str(fd, 'slug');
  if (fd.get('confirm') !== 'on') back('/admin/cities', 'Tick the confirmation box to delete.', 'err');
  if (readDb().cities.length <= 1) back('/admin/cities', 'Keep at least one starting city.', 'err');
  updateDb((db) => { db.cities = db.cities.filter((c) => c.slug !== s); });
  refresh();
  back('/admin/cities', 'City removed.');
}

/* ---------- site content ---------- */

export async function saveSettings(fd: FormData) {
  await requireAdmin();
  const pitch = [0, 1, 2, 3, 4, 5]
    .map((i) => ({ title: str(fd, `pitchTitle${i}`), body: str(fd, `pitchBody${i}`) }))
    .filter((p) => p.title);
  updateDb((db) => {
    db.settings = {
      banner: { enabled: fd.get('bannerEnabled') === 'on', text: str(fd, 'bannerText'), linkLabel: str(fd, 'bannerLinkLabel'), linkHref: str(fd, 'bannerLinkHref') },
      hero: { title: str(fd, 'heroTitle') || 'Explore.', tagline: str(fd, 'heroTagline'), sub: str(fd, 'heroSub'), primaryCta: str(fd, 'heroPrimaryCta') || 'Plan my escape', secondaryCta: str(fd, 'heroSecondaryCta') || 'Surprise me' },
      rail: { title: str(fd, 'railTitle') || 'Peaking now.', subtitle: str(fd, 'railSubtitle') },
      planner: { title: str(fd, 'plannerTitle') || 'The planner.', subtitle: str(fd, 'plannerSubtitle'), submitLabel: str(fd, 'plannerSubmit') || 'Find my escape', rollLabel: str(fd, 'plannerRoll') || 'Surprise me' },
      featured: fd.getAll('featured').map(String).filter((s) => db.destinations.some((d) => d.slug === s)),
      pitch,
      footerNote: str(fd, 'footerNote'),
      autoPublishEvents: fd.get('autoPublishEvents') === 'on',
    };
  });
  refresh();
  back('/admin/settings', 'Site content saved.');
}

/* ---------- booking engine: trips (departures) ---------- */

export async function saveDeparture(fd: FormData) {
  await requireAdmin();
  const original = str(fd, 'originalId');
  const title = str(fd, 'title');
  const destSlug = str(fd, 'destSlug');
  const startDate = str(fd, 'startDate');
  const endDate = str(fd, 'endDate');
  const to = original ? `/admin/trips/${original}` : '/admin/trips/new';
  if (!title || !destSlug) back(to, 'Title and place are required.', 'err');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate) back(to, 'Check the dates — end must be on or after start.', 'err');
  const id = original || `${slug(`${destSlug.split('-').slice(0, 2).join('-')}-${title}`)}-${startDate.slice(0, 7)}`;
  if (!original && readDb().departures.some((d) => d.id === id)) back(to, 'A trip with the same title and month already exists.', 'err');
  const dep = {
    id, destSlug, title, startDate, endDate,
    pricePerPerson: Math.max(0, Math.round(num(fd, 'pricePerPerson'))),
    seatsTotal: clamp(Math.round(num(fd, 'seatsTotal', 10)), 1, 200),
    startsFrom: str(fd, 'startsFrom'),
    inclusions: lines(fd, 'inclusions'),
    exclusions: lines(fd, 'exclusions'),
    published: fd.get('published') === 'on',
  };
  updateDb((db) => {
    const i = db.departures.findIndex((x) => x.id === id);
    if (i === -1) db.departures.push(dep); else db.departures[i] = dep;
  });
  refresh();
  back(`/admin/trips/${id}`, original ? 'Trip saved.' : 'Trip created.');
}

export async function deleteDeparture(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id');
  if (fd.get('confirm') !== 'on') back(`/admin/trips/${id}`, 'Tick the confirmation box to delete.', 'err');
  if (readDb().bookings.some((b) => b.departureId === id && b.status !== 'cancelled')) back(`/admin/trips/${id}`, 'This trip has active bookings. Cancel them or unpublish the trip instead.', 'err');
  updateDb((db) => { db.departures = db.departures.filter((d) => d.id !== id); });
  refresh();
  back('/admin/trips', 'Trip deleted.');
}

/* ---------- booking engine: stays ---------- */

export async function saveStay(fd: FormData) {
  await requireAdmin();
  const original = str(fd, 'originalId');
  const name = str(fd, 'name');
  const destSlug = str(fd, 'destSlug');
  const to = original ? `/admin/stays/${original}` : '/admin/stays/new';
  if (!name || !destSlug) back(to, 'Name and place are required.', 'err');
  const id = original || slug(name);
  const db = readDb();
  if (!original && db.stays.some((s) => s.id === id)) back(to, 'A stay with this name already exists.', 'err');
  const existing = db.stays.find((s) => s.id === id);
  let image = existing?.image;
  try {
    const up = await saveUpload(fd, 'image', `stay-${id}`);
    if (up) { await removeUpload(image); image = up; }
    else if (fd.get('removeImage')) { await removeUpload(image); image = undefined; }
  } catch (e) { back(to, (e as Error).message, 'err'); }
  const stay = {
    id, destSlug, name,
    type: str(fd, 'type') || 'Homestay',
    pricePerNight: Math.max(0, Math.round(num(fd, 'pricePerNight'))),
    rooms: clamp(Math.round(num(fd, 'rooms', 1)), 1, 200),
    maxGuestsPerRoom: clamp(Math.round(num(fd, 'maxGuestsPerRoom', 2)), 1, 20),
    amenities: lines(fd, 'amenities'),
    about: str(fd, 'about'),
    image,
    published: fd.get('published') === 'on',
  };
  updateDb((db) => {
    const i = db.stays.findIndex((x) => x.id === id);
    if (i === -1) db.stays.push(stay); else db.stays[i] = stay;
  });
  refresh();
  back(`/admin/stays/${id}`, original ? 'Stay saved.' : 'Stay created.');
}

export async function deleteStay(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id');
  if (fd.get('confirm') !== 'on') back(`/admin/stays/${id}`, 'Tick the confirmation box to delete.', 'err');
  if (readDb().bookings.some((b) => b.stayId === id && b.status !== 'cancelled' && (b.checkOut ?? '') >= new Date().toISOString().slice(0, 10)))
    back(`/admin/stays/${id}`, 'This stay has upcoming bookings. Unpublish it instead.', 'err');
  const s = readDb().stays.find((x) => x.id === id);
  await removeUpload(s?.image);
  updateDb((db) => { db.stays = db.stays.filter((x) => x.id !== id); });
  refresh();
  back('/admin/stays', 'Stay deleted.');
}

/* ---------- inbox: bookings & leads ---------- */

export async function updateBooking(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id');
  const status = str(fd, 'status');
  updateDb((db) => {
    const b = db.bookings.find((x) => x.id === id);
    if (!b) return;
    if (['pending', 'confirmed', 'paid', 'cancelled'].includes(status)) b.status = status as typeof b.status;
    if (fd.has('adminNotes')) b.adminNotes = str(fd, 'adminNotes') || undefined;
    if (fd.has('total') && str(fd, 'total') !== '') b.total = Math.max(0, Math.round(num(fd, 'total')));
    b.updatedAt = new Date().toISOString();
  });
  refresh();
  back(`/admin/bookings/${id}`, 'Booking updated.');
}

export async function updateLead(fd: FormData) {
  await requireAdmin();
  const id = str(fd, 'id');
  const status = str(fd, 'status');
  updateDb((db) => {
    const l = db.leads.find((x) => x.id === id);
    if (!l) return;
    if (['new', 'contacted', 'converted', 'closed'].includes(status)) l.status = status as typeof l.status;
    if (fd.has('adminNotes')) l.adminNotes = str(fd, 'adminNotes') || undefined;
    l.updatedAt = new Date().toISOString();
  });
  const ret = str(fd, 'return');
  back(ret.startsWith('/admin/') ? ret : `/admin/leads/${id}`, 'Lead updated.');
}

/* ---------- events ---------- */


export async function saveEvent(fd: FormData) {
  await requireAdmin();
  const original = str(fd, 'originalSlug');
  const to = original ? `/admin/events/${original}` : '/admin/events/new';
  const name = str(fd, 'name');
  const startDate = str(fd, 'startDate');
  const endDate = str(fd, 'endDate') || startDate;
  if (!name) back(to, 'Event name is required.', 'err');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || endDate < startDate) back(to, 'Check the dates — end must be on or after start.', 'err');
  const lat = num(fd, 'lat', NaN), lng = num(fd, 'lng', NaN);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) back(to, 'Latitude and longitude are required (used for “near this place” and travel times).', 'err');
  const s = original || slug(`${name}-${startDate.slice(0, 4)}`);
  const db = readDb();
  if (!original && db.events.some((e) => e.slug === s)) back(to, `An event with URL /events/${s} already exists.`, 'err');
  const existing = db.events.find((e) => e.slug === s);
  let image = existing?.image;
  try {
    const up = await saveUpload(fd, 'image', `event-${s}`);
    if (up) { await removeUpload(image); image = up; }
    else if (fd.get('removeImage')) { await removeUpload(image); image = undefined; }
  } catch (e) { back(to, (e as Error).message, 'err'); }
  const status = str(fd, 'status');
  const ev = {
    slug: s, name,
    category: (str(fd, 'category') || 'festival') as EventCategory,
    startDate, endDate,
    dateStatus: (str(fd, 'dateStatus') === 'confirmed' ? 'confirmed' : 'expected') as 'confirmed' | 'expected',
    town: str(fd, 'town'), state: str(fd, 'state'), lat, lng,
    destSlug: str(fd, 'destSlug') || undefined,
    roadTripSlug: str(fd, 'roadTripSlug') || undefined,
    hook: str(fd, 'hook'), about: str(fd, 'about'),
    tips: lines(fd, 'tips'),
    recurring: (str(fd, 'recurring') === 'one-off' ? 'one-off' : 'annual') as 'annual' | 'one-off',
    nextEdition: str(fd, 'nextEdition') || undefined,
    sourceUrl: str(fd, 'sourceUrl') || undefined,
    ticketUrl: str(fd, 'ticketUrl') || undefined,
    roadFactor: str(fd, 'roadFactor') ? clamp(num(fd, 'roadFactor', 1.5), 1, 3) : undefined,
    image,
    status: (['published', 'draft', 'suggested'].includes(status) ? status : 'draft') as 'published' | 'draft' | 'suggested',
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  updateDb((db) => {
    const i = db.events.findIndex((e) => e.slug === s);
    if (i === -1) db.events.push(ev); else db.events[i] = ev;
  });
  refresh();
  refreshRoutesInBackground();
  back(`/admin/events/${s}`, original ? 'Event saved.' : 'Event created.');
}

export async function setEventStatus(fd: FormData) {
  await requireAdmin();
  const s = str(fd, 'slug');
  const status = str(fd, 'status');
  if (status === 'reject') {
    updateDb((db) => { db.events = db.events.filter((e) => !(e.slug === s && e.status === 'suggested')); });
    refresh();
    back('/admin/events?tab=suggested', 'Suggestion dismissed.');
  }
  updateDb((db) => {
    const e = db.events.find((x) => x.slug === s);
    if (e && ['published', 'draft'].includes(status)) e.status = status as 'published' | 'draft';
  });
  refresh();
  back(str(fd, 'return') || '/admin/events', status === 'published' ? 'Published — it’s live on the site.' : 'Updated.');
}

export async function deleteEvent(fd: FormData) {
  await requireAdmin();
  const s = str(fd, 'slug');
  if (fd.get('confirm') !== 'on') back(`/admin/events/${s}`, 'Tick the confirmation box to delete.', 'err');
  const e = readDb().events.find((x) => x.slug === s);
  await removeUpload(e?.image);
  updateDb((db) => { db.events = db.events.filter((x) => x.slug !== s); });
  refresh();
  back('/admin/events', 'Event deleted.');
}

export async function importEvents(fd: FormData) {
  await requireAdmin();
  let items: unknown;
  try { items = JSON.parse(str(fd, 'json') || '[]'); } catch { back('/admin/events?tab=suggested', 'That isn’t valid JSON.', 'err'); }
  const arr = Array.isArray(items) ? items : Array.isArray((items as { events?: unknown[] })?.events) ? (items as { events: unknown[] }).events : null;
  if (!arr) back('/admin/events?tab=suggested', 'Paste an array of events.', 'err');
  let r = { added: [] as string[], skipped: [] as string[], errors: [] as string[], published: [] as string[] };
  updateDb((db) => { r = addSuggestions(db, arr!); });
  refresh();
  const msg = `Added ${r.added.length} event(s), ${r.published.length} published live${r.skipped.length ? `, skipped ${r.skipped.length} duplicate(s)` : ''}${r.errors.length ? `. Problems: ${r.errors.slice(0, 3).join('; ')}` : ''}.`;
  back('/admin/events?tab=suggested', msg, r.errors.length && !r.added.length ? 'err' : 'ok');
}

/* ---------- road trips ---------- */

export async function saveRoadTrip(fd: FormData) {
  await requireAdmin();
  const original = str(fd, 'originalSlug');
  const to = original ? `/admin/roadtrips/${original}` : '/admin/roadtrips/new';
  const title = str(fd, 'title');
  if (!title) back(to, 'Title is required.', 'err');
  const stops: RoadStop[] = [];
  const bad: number[] = [];
  lines(fd, 'stops').forEach((l, i) => {
    const [name, lat, lng, nights, note, destSlug, legFactor] = l.split('|').map((x) => x.trim());
    const s: RoadStop = { name, lat: Number(lat), lng: Number(lng), nights: Math.max(0, Math.round(Number(nights) || 0)) };
    if (!name || !Number.isFinite(s.lat) || !Number.isFinite(s.lng) || !lat || !lng) { bad.push(i + 1); return; }
    if (note) s.note = note;
    if (destSlug) s.destSlug = destSlug;
    if (legFactor && Number(legFactor) >= 1) s.legFactor = Number(legFactor);
    stops.push(s);
  });
  if (bad.length) back(to, `Stop line(s) ${bad.join(', ')} need: Name | lat | lng | nights.`, 'err');
  if (stops.length < 2) back(to, 'Add at least two stops.', 'err');
  const s = original || slug(`${title}-road-trip`);
  const db = readDb();
  if (!original && db.roadTrips.some((t) => t.slug === s)) back(to, 'A road trip with this title exists.', 'err');
  const existing = db.roadTrips.find((t) => t.slug === s);
  let image = existing?.image;
  try {
    const up = await saveUpload(fd, 'image', `road-${s}`);
    if (up) { await removeUpload(image); image = up; }
    else if (fd.get('removeImage')) { await removeUpload(image); image = undefined; }
  } catch (e) { back(to, (e as Error).message, 'err'); }
  const t = {
    slug: s, title, hook: str(fd, 'hook'), about: str(fd, 'about'), stops,
    roadFactor: clamp(num(fd, 'roadFactor', 1.5), 1, 2.5),
    bestMonths: months(fd, 'bestMonths'),
    difficulty: (['easy', 'moderate', 'hardcore'].includes(str(fd, 'difficulty')) ? str(fd, 'difficulty') : 'moderate') as 'easy' | 'moderate' | 'hardcore',
    vehicle: str(fd, 'vehicle') || 'Any car',
    highlights: lines(fd, 'highlights'), theIck: lines(fd, 'theIck'),
    permits: str(fd, 'permits') || undefined, fuelNote: str(fd, 'fuelNote') || undefined,
    vibes: fd.getAll('vibes').map(String),
    palette: [str(fd, 'color1') || '#1E3A5F', str(fd, 'color2') || '#FFB703'] as [string, string],
    image, published: fd.get('published') === 'on',
  };
  updateDb((db) => {
    const i = db.roadTrips.findIndex((x) => x.slug === s);
    if (i === -1) db.roadTrips.push(t); else db.roadTrips[i] = t;
  });
  refresh();
  refreshRoutesInBackground();
  back(`/admin/roadtrips/${s}`, original ? 'Road trip saved.' : 'Road trip created.');
}

export async function deleteRoadTrip(fd: FormData) {
  await requireAdmin();
  const s = str(fd, 'slug');
  if (fd.get('confirm') !== 'on') back(`/admin/roadtrips/${s}`, 'Tick the confirmation box to delete.', 'err');
  const t = readDb().roadTrips.find((x) => x.slug === s);
  await removeUpload(t?.image);
  updateDb((db) => {
    db.roadTrips = db.roadTrips.filter((x) => x.slug !== s);
    db.events.forEach((e) => { if (e.roadTripSlug === s) e.roadTripSlug = undefined; });
  });
  refresh();
  back('/admin/roadtrips', 'Road trip deleted.');
}

/* ---------- road-time routing ---------- */

export async function refreshRoadTimes() {
  await requireAdmin();
  const r = await refreshRoutes({ budgetMs: 50_000 });
  refresh();
  if (r.provider === 'off') back('/admin', 'Road routing is turned off (ROUTING_PROVIDER=off).', 'err');
  if (r.error) back('/admin', `Routing stopped: ${r.error}. Fetched ${r.fetched}; ${r.remaining} still missing — try again in a minute.`, 'err');
  back('/admin', r.requested === 0 ? 'All road times are already up to date.' : `Fetched ${r.fetched} road routes. ${r.remaining ? `${r.remaining} left — click again to continue.` : 'All done.'}`);
}
