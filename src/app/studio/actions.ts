'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { readDb, updateDb } from '@/lib/db';
import { currentAccount, endContribSession, newId, requireAccount } from '@/lib/contrib';
import { isAdmin } from '@/lib/auth';
import { emptyNote, noteChecklist } from '@/lib/noteRules';
import { INDIA_STATES } from '@/lib/gems';
import type { NoteDoc } from '@/lib/types';

const clip = (s: unknown, n: number) => String(s ?? '').slice(0, n);

/** Only keep the fields we expect, with sane lengths — never trust the browser. */
function clean(input: NoteDoc, base: NoteDoc): NoteDoc {
  const photo = (p: { src?: string; alt?: string; caption?: string; wide?: boolean }) => ({
    src: /^\/media\/[\w.-]+$/.test(String(p.src)) ? String(p.src) : '', alt: clip(p.alt, 200), caption: clip(p.caption, 200) || undefined, wide: !!p.wide,
  });
  return {
    ...base,
    title: clip(input.title, 120).trim(),
    description: clip(input.description, 200).trim(),
    place: clip(input.place, 80).trim(),
    stateSlug: INDIA_STATES.some((s) => s.slug === input.stateSlug) ? input.stateSlug : '',
    visited: clip(input.visited, 40).trim(),
    intro: clip(input.intro, 4000),
    cover: input.cover?.src ? photo(input.cover) : undefined,
    sections: (input.sections ?? []).slice(0, 12).map((s) => ({
      kicker: clip(s.kicker, 100), heading: clip(s.heading, 140), body: clip(s.body, 8000),
      photos: (s.photos ?? []).slice(0, 6).map(photo).filter((p) => p.src),
    })),
    quick: (input.quick ?? []).slice(0, 8).map((x) => ({ q: clip(x.q, 140), a: clip(x.a, 300) })),
    faq: (input.faq ?? []).slice(0, 12).map((x) => ({ q: clip(x.q, 200), a: clip(x.a, 800) })),
    sources: (input.sources ?? []).slice(0, 8).map((x) => ({ label: clip(x.label, 120), href: clip(x.href, 400) })).filter((x) => x.label && x.href),
    keywords: clip(input.keywords, 400),
    photoConsent: !!input.photoConsent,
    updatedAt: new Date().toISOString(),
  };
}

/** Writer (own notes, not while published/pending) or admin (any note). */
async function canEdit(id: string) {
  const admin = await isAdmin();
  const acc = await currentAccount();
  const note = (readDb().notes ?? []).find((n) => n.id === id);
  if (!note) return { note: null, admin, acc };
  const mine = !!acc && note.accountId === acc.id;
  return { note: admin || mine ? note : null, admin, acc };
}

export async function createNote() {
  const acc = await requireAccount();
  const id = newId(8);
  updateDb((db) => { db.notes ??= []; db.notes.push(emptyNote(id, acc.authorSlug, acc.id)); });
  redirect(`/studio/notes/${id}`);
}

export async function saveNote(id: string, input: NoteDoc, intent: 'save' | 'submit'): Promise<{ ok: boolean; msg: string; status?: NoteDoc['status'] }> {
  const { note, admin, acc } = await canEdit(id);
  if (!note) return { ok: false, msg: 'You can’t edit this note — please sign in again.' };
  if (!admin && (note.status === 'pending' || note.status === 'published')) return { ok: false, msg: note.status === 'pending' ? 'It’s with the editor now — you can edit again if they send it back.' : 'Published notes are edited by the editor. Ask them for changes.' };
  const next = clean(input, note);
  if (intent === 'submit') {
    const author = (readDb().authors ?? []).find((a) => a.slug === note.authorSlug);
    const missing = noteChecklist(next, (author?.bio ?? '').length >= 80).filter((c) => !c.ok);
    if (missing.length) return { ok: false, msg: `Almost there — still missing: ${missing.map((m) => m.label).join('; ')}.` };
    if (!admin) { next.status = 'pending'; next.submittedAt = new Date().toISOString(); next.reviewNote = undefined; }
  }
  updateDb((db) => { const i = (db.notes ?? []).findIndex((n) => n.id === id); if (i >= 0) db.notes![i] = next; });
  if (next.status === 'published') revalidatePath('/', 'layout');
  void acc;
  return { ok: true, msg: intent === 'submit' && !admin ? 'Sent for review. We’ll read it and either publish it or send notes back.' : 'Saved.', status: next.status };
}

export async function deleteDraft(fd: FormData) {
  const id = String(fd.get('id'));
  const { note, admin } = await canEdit(id);
  if (note && (admin || note.status === 'draft' || note.status === 'changes')) {
    updateDb((db) => { db.notes = (db.notes ?? []).filter((n) => n.id !== id); });
  }
  redirect('/studio');
}

export async function saveMyProfile(fd: FormData): Promise<void> {
  const acc = await requireAccount();
  const s = (k: string) => String(fd.get(k) ?? '').trim();
  const lines = (k: string) => s(k).split('\n').map((x) => x.trim()).filter(Boolean);
  const links = lines('links').filter((u) => /^https:\/\/\S+$/.test(u)).slice(0, 8);
  const photo = s('photo');
  updateDb((db) => {
    const a = (db.authors ?? []).find((x) => x.slug === acc.authorSlug);
    if (!a) return;
    a.name = s('name').slice(0, 80) || a.name;
    a.role = s('role').slice(0, 80) || a.role;
    a.bio = s('bio').slice(0, 2000);
    a.expertise = lines('expertise').slice(0, 10);
    a.regions = lines('regions').slice(0, 20);
    a.links = links;
    if (/^\/media\/[\w.-]+$/.test(photo)) a.photo = photo;
    const ac = (db.accounts ?? []).find((x) => x.id === acc.id);
    if (ac) ac.name = a.name;
  });
  revalidatePath('/', 'layout');
  redirect('/studio/profile?ok=1');
}

export async function signOut() {
  await endContribSession();
  redirect('/contribute');
}
