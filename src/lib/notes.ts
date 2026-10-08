/**
 * All field notes in one list: hand-built ones in src/data/notes.ts + ones written in the contributor studio (DB).
 */
import { NOTES } from '@/data/notes';
import { readDb } from './db';
import { INDIA_STATES } from './gems';
import type { NoteDoc } from './types';

export type NoteSummary = {
  slug: string;
  title: string;
  shortName: string;
  description: string;
  intro: string;
  stateSlug: string;
  stateName: string;
  visited: string;
  image: { src: string; alt: string };
  authorSlug: string;
  published: string;
  keywords: string;
  source: 'code' | 'studio';
};

export const stateNameOf = (slug: string) => INDIA_STATES.find((s) => s.slug === slug)?.name ?? slug;

export const studioNotes = (): NoteDoc[] => (readDb().notes ?? []).filter((n) => n.status === 'published' && n.slug);
export const studioNoteBySlug = (slug: string) => studioNotes().find((n) => n.slug === slug);

export function allNotes(): NoteSummary[] {
  const code: NoteSummary[] = NOTES.map((n) => ({
    slug: n.slug, title: n.title, shortName: n.shortName, description: n.description, intro: n.intro,
    stateSlug: n.stateSlug, stateName: n.stateName, visited: n.visited, image: { src: n.hero.src, alt: n.hero.alt },
    authorSlug: n.authorSlug, published: n.published, keywords: n.keywords, source: 'code',
  }));
  const db: NoteSummary[] = studioNotes().map((n) => ({
    slug: n.slug, title: n.title, shortName: n.title, description: n.description, intro: n.intro,
    stateSlug: n.stateSlug, stateName: stateNameOf(n.stateSlug), visited: n.visited,
    image: n.cover ? { src: n.cover.src, alt: n.cover.alt } : { src: '/opengraph-image', alt: n.title },
    authorSlug: n.authorSlug, published: (n.publishedAt ?? n.updatedAt).slice(0, 10), keywords: n.keywords, source: 'studio',
  }));
  return [...db, ...code].sort((a, b) => b.published.localeCompare(a.published));
}

export const noteSummary = (slug: string) => allNotes().find((n) => n.slug === slug);
export const notesInState = (stateSlug: string) => allNotes().filter((n) => n.stateSlug === stateSlug);
export const notesByAuthor = (authorSlug: string) => allNotes().filter((n) => n.authorSlug === authorSlug);
export const allNoteDocsByAuthor = (authorSlug: string) => (readDb().notes ?? []).filter((n) => n.authorSlug === authorSlug);
