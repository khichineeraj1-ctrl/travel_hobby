/**
 * AI first draft of a field note from the writer's own trip notes + photos, written to CONTENT_GUIDE.md.
 * The model may only use facts the writer gave (and what's visible in the photos); anything missing goes into `gaps`.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { UPLOAD_DIR } from './db';
import { INDIA_STATES } from './gems';
import type { NoteDoc, NotePhotoDoc } from './types';

export const draftEnabled = () => !!process.env.ANTHROPIC_API_KEY && process.env.DRAFTS !== 'off';
const MODEL = () => process.env.DRAFT_MODEL || 'claude-sonnet-4-5';

const GUIDE = `You are the senior editor of Beyond Explored, an Indian offbeat-travel site. Turn a writer's raw trip notes and photos into a polished first draft of a "field note".

VOICE: a seasoned travel blogger — confident, sensory, opinionated, practical. First person plural ("we") for the writer's experience. Short paragraphs. One honest "here's the catch" where the notes support it. Indian English, ₹ for money.

HARD RULES (trust is everything):
- Use ONLY facts in the writer's notes and what is clearly visible in the photos. Never invent prices, dates, timings, dishes, sightings, names, distances or experiences.
- If something useful is missing (cost, how to book, best month, timings, how they got there), do not guess — add a short question to "gaps".
- Opening dates, prices and rules the writer states: keep them, but phrase as "when we went (Month Year)".
- No children's faces or number plates should be described.

STRUCTURE (for Google + AI search):
- title: 40–80 chars, promise a specific payoff (e.g. "Jim Corbett, done right: the zone calendar nobody tells you about").
- description: 110–155 chars, answers the main question directly.
- intro: 3–5 sentences hook — what most people get wrong, what we found. 60–110 words.
- sections: 3–5. Each heading is a QUESTION people actually search ("Where should I stay in X to…?", "Which … is best in October?", "How do I get to X from Delhi?", "Ideas for a spare day near X"). Add a short blogger-voice kicker line above each. Body: answer first in the opening sentence, then the story and practical detail. 80–220 words each. Use **double asterisks** for 1–2 key phrases per section. Blank line between paragraphs.
- quick: 4–6 one-line answers (question → short answer) a skimmer or AI can lift as-is.
- faq: 5–8 full-sentence Q&As people Google. Only answer from the notes.
- keywords: extra search words (nearby towns, attractions, restaurants mentioned).
- photos: give EVERY photo a precise alt text (what it shows, where) and a short caption in the blog voice; choose the best landscape one as cover; place each other photo in exactly one section where it fits.`;

const TOOL = {
  name: 'field_note',
  description: 'The drafted field note',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string' }, description: { type: 'string' }, place: { type: 'string' },
      stateSlug: { type: 'string', enum: INDIA_STATES.map((s) => s.slug) },
      visited: { type: 'string', description: 'Month Year, e.g. October 2026, only if the notes say so' },
      intro: { type: 'string' },
      sections: { type: 'array', items: { type: 'object', properties: { kicker: { type: 'string' }, heading: { type: 'string' }, body: { type: 'string' }, photos: { type: 'array', items: { type: 'integer' }, description: 'photo numbers placed here' } }, required: ['heading', 'body', 'photos'] } },
      quick: { type: 'array', items: { type: 'object', properties: { q: { type: 'string' }, a: { type: 'string' } }, required: ['q', 'a'] } },
      faq: { type: 'array', items: { type: 'object', properties: { q: { type: 'string' }, a: { type: 'string' } }, required: ['q', 'a'] } },
      keywords: { type: 'string' },
      cover: { type: 'integer', description: 'photo number for the cover' },
      photoText: { type: 'array', items: { type: 'object', properties: { n: { type: 'integer' }, alt: { type: 'string' }, caption: { type: 'string' } }, required: ['n', 'alt'] } },
      gaps: { type: 'array', items: { type: 'string' }, description: 'questions for the writer about missing facts' },
    },
    required: ['title', 'description', 'place', 'intro', 'sections', 'quick', 'faq', 'photoText', 'gaps'],
  },
};

async function imageBlock(p: NotePhotoDoc) {
  const file = path.join(UPLOAD_DIR, path.basename(p.src));
  const buf = await fs.readFile(file);
  let data = buf;
  try {
    const sharp = (await import('sharp')).default;
    data = await sharp(buf).resize(900, 900, { fit: 'inside' }).jpeg({ quality: 70 }).toBuffer();
  } catch { /* send as-is */ }
  return { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: data.toString('base64') } };
}

export async function draftNote(base: NoteDoc, context: string, pool: NotePhotoDoc[]): Promise<NoteDoc> {
  const photos = pool.slice(0, 10);
  const content: unknown[] = [];
  for (let i = 0; i < photos.length; i++) {
    content.push({ type: 'text', text: `Photo ${i + 1}${photos[i].caption ? ` (writer's note: ${photos[i].caption})` : ''}:` });
    content.push(await imageBlock(photos[i]));
  }
  content.push({ type: 'text', text: `Writer's trip notes:\n"""\n${context}\n"""\nDraft the field note now via the tool.` });

  const res = await fetch(process.env.ANTHROPIC_BASE ?? 'https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL(), max_tokens: 6000, system: GUIDE, tools: [TOOL], tool_choice: { type: 'tool', name: 'field_note' }, messages: [{ role: 'user', content }] }),
    signal: AbortSignal.timeout(150_000),
  });
  if (!res.ok) throw new Error(`The drafting service said no (${res.status}). Try again in a minute.`);
  const j = await res.json();
  const d = (j.content ?? []).find((c: { type: string }) => c.type === 'tool_use')?.input;
  if (!d?.sections) throw new Error('The draft came back empty — try adding a bit more detail.');

  const text = new Map<number, { alt: string; caption?: string }>((d.photoText ?? []).map((x: { n: number; alt: string; caption?: string }) => [x.n, x]));
  const ph = (n: number): NotePhotoDoc | undefined => {
    const p = photos[n - 1];
    if (!p) return undefined;
    const t = text.get(n);
    return { ...p, alt: t?.alt || p.alt || '', caption: t?.caption || p.caption };
  };
  const used = new Set<number>();
  const coverN = Number.isInteger(d.cover) && photos[d.cover - 1] ? d.cover : photos.findIndex((p) => p.wide) + 1 || 1;
  const cover = photos.length ? ph(coverN) : base.cover;
  if (photos.length) used.add(coverN);
  const sections = (d.sections as { kicker?: string; heading: string; body: string; photos: number[] }[]).slice(0, 6).map((s) => ({
    kicker: s.kicker ?? '', heading: s.heading, body: s.body,
    photos: (s.photos ?? []).filter((n) => !used.has(n) && photos[n - 1] && used.add(n)).map((n) => ph(n)!).slice(0, 6),
  }));
  // any photo the model forgot goes into the last section
  photos.forEach((_, i) => { if (!used.has(i + 1) && sections.length) { sections[sections.length - 1].photos.push(ph(i + 1)!); used.add(i + 1); } });

  return {
    ...base,
    title: d.title ?? base.title,
    description: d.description ?? base.description,
    place: d.place || base.place,
    stateSlug: INDIA_STATES.some((s) => s.slug === d.stateSlug) ? d.stateSlug : base.stateSlug,
    visited: d.visited || base.visited,
    intro: d.intro ?? base.intro,
    cover,
    sections,
    quick: (d.quick ?? []).slice(0, 8),
    faq: (d.faq ?? []).slice(0, 10),
    keywords: d.keywords ?? base.keywords,
    gaps: (d.gaps ?? []).slice(0, 10),
    context,
    pool,
    drafts: (base.drafts ?? 0) + 1,
    updatedAt: new Date().toISOString(),
  };
}
