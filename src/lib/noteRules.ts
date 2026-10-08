import type { NoteDoc } from './types';

/** The bar a field note must clear before review — mirrors CONTENT_GUIDE.md (SEO + GEO + E-E-A-T). Pure, so the editor can show it live. */
export function noteChecklist(d: NoteDoc, bioOk: boolean) {
  const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
  const photos = d.sections.reduce((n, s) => n + s.photos.length, 0);
  const bodyWords = words(d.intro) + d.sections.reduce((n, s) => n + words(s.body), 0);
  const questionHeads = d.sections.filter((s) => /\?\s*$/.test(s.heading.trim())).length;
  return [
    { ok: d.title.trim().length >= 20 && d.title.trim().length <= 90, label: 'Title of 20–90 characters' },
    { ok: d.description.trim().length >= 70 && d.description.trim().length <= 160, label: 'Search summary of 70–160 characters' },
    { ok: !!d.place.trim() && !!d.stateSlug && !!d.visited.trim(), label: 'Place, state and when you visited' },
    { ok: words(d.intro) >= 50, label: 'Intro of at least 50 words' },
    { ok: d.sections.length >= 2 && d.sections.every((s) => s.heading.trim() && words(s.body) >= 40), label: 'At least 2 sections, each with a heading and 40+ words' },
    { ok: questionHeads >= 2, label: 'At least 2 headings written as questions people ask (“Where should I…?”, “Which…?”)' },
    { ok: bodyWords >= 400, label: `At least 400 words in total (now ${bodyWords})` },
    { ok: !!d.cover, label: 'A cover photo (landscape works best)' },
    { ok: photos >= 3, label: `At least 3 of your own photos in sections (now ${photos})` },
    { ok: d.cover ? !!d.cover.alt.trim() : false, label: 'Describe every photo (alt text) — cover included' },
    { ok: d.sections.every((s) => s.photos.every((p) => p.alt.trim())), label: 'Alt text on every section photo' },
    { ok: d.quick.filter((x) => x.q.trim() && x.a.trim()).length >= 3, label: 'At least 3 quick answers' },
    { ok: d.faq.filter((x) => x.q.trim() && x.a.trim()).length >= 3, label: 'At least 3 FAQs' },
    { ok: d.sources.every((s) => /^https:\/\//.test(s.href)), label: 'Source links start with https://' },
    { ok: !!d.photoConsent, label: 'Photo promise ticked' },
    { ok: bioOk, label: 'Your author profile has a bio (readers and Google check who wrote it)' },
  ];
}

export const emptyNote = (id: string, authorSlug: string, accountId?: string): NoteDoc => {
  const now = new Date().toISOString();
  return {
    id, slug: '', authorSlug, accountId, status: 'draft', title: '', description: '', place: '', stateSlug: '', visited: '', intro: '',
    sections: [
      { kicker: '', heading: 'Where should I …?', body: '', photos: [] },
      { kicker: '', heading: 'Which … is best?', body: '', photos: [] },
    ],
    quick: [{ q: '', a: '' }, { q: '', a: '' }, { q: '', a: '' }],
    faq: [{ q: '', a: '' }, { q: '', a: '' }, { q: '', a: '' }],
    sources: [], keywords: '', createdAt: now, updatedAt: now,
  };
};
