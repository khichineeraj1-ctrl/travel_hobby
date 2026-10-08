import { readDb } from './db';
import { DEFAULT_AUTHOR } from '@/data/authors';
import { abs } from './seo';
import type { Author } from './types';

export const getAuthors = (): Author[] => readDb().authors ?? [DEFAULT_AUTHOR];
export const authorBySlug = (slug: string) => getAuthors().find((a) => a.slug === slug);
/** Falls back to the first author so a renamed/removed byline never breaks a page. */
export const authorOrDefault = (slug?: string) => (slug && authorBySlug(slug)) || getAuthors()[0];
export const authorHref = (a: Author) => `/authors/${a.slug}`;

/** schema.org Person/Organization for Article.author and the profile page. */
export function authorLd(a: Author) {
  return {
    '@type': a.kind,
    '@id': abs(`${authorHref(a)}#author`),
    name: a.name,
    url: abs(authorHref(a)),
    ...(a.kind === 'Person' ? { jobTitle: a.role } : { description: a.role }),
    ...(a.photo ? { image: abs(a.photo) } : {}),
    ...(a.links.length ? { sameAs: a.links } : {}),
    ...(a.expertise.length ? { knowsAbout: a.expertise } : {}),
  };
}
