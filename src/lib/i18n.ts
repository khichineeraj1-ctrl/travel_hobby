/**
 * Machine translation cache for the multilingual site.
 * Strings found on pages are translated by Claude in the background (batched, cheap model) and stored per language
 * in DATA_DIR/i18n/<lang>.json, so each string is paid for once. Pages read from this cache.
 */
import fs from 'node:fs';
import path from 'node:path';
import { headers } from 'next/headers';
import { DATA_DIR } from './db';
import { NON_EN, isLang, langInfo, type Lang } from './langs';

const DIR = path.join(DATA_DIR, 'i18n');
const META = path.join(DIR, '_meta.json');
const MODEL = () => process.env.I18N_MODEL || 'claude-haiku-4-5';
const DAILY_CHARS = () => Number(process.env.I18N_DAILY_CHARS) || 600_000;
export const i18nEnabled = () => !!process.env.ANTHROPIC_API_KEY && process.env.I18N !== 'off';

/** Current page language (set by src/proxy.ts). */
export async function getLang(): Promise<Lang> {
  const l = (await headers()).get('x-be-lang');
  return isLang(l) ? l : 'en';
}
export async function getPath(): Promise<string> {
  return (await headers()).get('x-be-path') || '/';
}

type Dict = Record<string, string>;
const cache = new Map<string, { mtime: number; dict: Dict }>();
const file = (lang: string) => path.join(DIR, `${lang}.json`);

export function dictFor(lang: Lang): Dict {
  if (lang === 'en') return {};
  const f = file(lang);
  try {
    const { mtimeMs } = fs.statSync(f);
    const c = cache.get(lang);
    if (c && c.mtime === mtimeMs) return c.dict;
    const dict = JSON.parse(fs.readFileSync(f, 'utf8')) as Dict;
    cache.set(lang, { mtime: mtimeMs, dict });
    return dict;
  } catch {
    return {};
  }
}

function writeDict(lang: Lang, add: Dict) {
  fs.mkdirSync(DIR, { recursive: true });
  const dict = { ...dictFor(lang), ...add };
  const tmp = `${file(lang)}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(dict));
  fs.renameSync(tmp, file(lang));
}

type Meta = { day: string; chars: number; calls: number; lastError?: string; lastRun?: string };
function meta(): Meta {
  try { return JSON.parse(fs.readFileSync(META, 'utf8')); } catch { return { day: '', chars: 0, calls: 0 }; }
}
function saveMeta(m: Meta) { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(META, JSON.stringify(m)); }
const today = () => new Date().toISOString().slice(0, 10);

/* ---------- queue + worker ---------- */

const queue = new Map<Lang, Set<string>>();
const failed = new Map<string, number>(); // `${lang}|${key}` → attempts
let running = false;

export function lookup(lang: Lang, keys: string[]) {
  const dict = dictFor(lang);
  const hits: Dict = {};
  const misses: string[] = [];
  for (const k of keys) (dict[k] !== undefined ? (hits[k] = dict[k]) : misses.push(k));
  return { hits, misses };
}

export function enqueue(lang: Lang, keys: string[]) {
  if (!i18nEnabled() || lang === 'en') return 0;
  const q = queue.get(lang) ?? new Set<string>();
  for (const k of keys) {
    if (q.size >= 4000) break;
    if ((failed.get(`${lang}|${k}`) ?? 0) >= 2) continue;
    q.add(k);
  }
  queue.set(lang, q);
  void pump();
  return q.size;
}

export const queueSizes = () => Object.fromEntries(NON_EN.map((l) => [l, queue.get(l)?.size ?? 0]));
export const i18nMeta = () => meta();
export const dictSizes = () => Object.fromEntries(NON_EN.map((l) => [l, Object.keys(dictFor(l)).length]));

async function pump() {
  if (running) return;
  running = true;
  try {
    for (;;) {
      const lang = NON_EN.find((l) => (queue.get(l)?.size ?? 0) > 0);
      if (!lang) break;
      const m = meta();
      if (m.day !== today()) { m.day = today(); m.chars = 0; m.calls = 0; }
      if (m.chars >= DAILY_CHARS()) { m.lastError = 'Daily translation limit reached — resumes tomorrow.'; saveMeta(m); break; }
      const q = queue.get(lang)!;
      const batch: string[] = [];
      let size = 0;
      for (const k of q) { if (batch.length >= 40 || size + k.length > 6000) break; batch.push(k); size += k.length; }
      batch.forEach((k) => q.delete(k));
      try {
        const out = await translateBatch(lang, batch);
        const add: Dict = {};
        batch.forEach((k, i) => {
          const t = out[i];
          if (typeof t === 'string' && t.trim() && markersOk(k, t)) add[k] = t;
          else failed.set(`${lang}|${k}`, (failed.get(`${lang}|${k}`) ?? 0) + 1);
        });
        if (Object.keys(add).length) writeDict(lang, add);
        m.chars += size; m.calls += 1; m.lastRun = new Date().toISOString(); m.lastError = undefined;
        saveMeta(m);
      } catch (e) {
        batch.forEach((k) => failed.set(`${lang}|${k}`, (failed.get(`${lang}|${k}`) ?? 0) + 1));
        m.lastError = (e as Error).message.slice(0, 300);
        saveMeta(m);
        await new Promise((r) => setTimeout(r, 4000));
      }
    }
  } finally {
    running = false;
  }
}

const MARK = /⟦(\d+)⟧/g;
const marks = (s: string) => [...s.matchAll(MARK)].map((x) => x[1]).join(',');
const markersOk = (src: string, out: string) => marks(src) === marks(out);

async function translateBatch(lang: Lang, items: string[]): Promise<string[]> {
  const info = langInfo(lang);
  const system = `You translate an Indian travel website from English into ${info.name} (${info.native}) for Indian readers.
Rules:
- Natural, warm, conversational ${info.name} as a well-travelled friend would write it — not stiff or bookish. Short UI labels stay short.
- Write place names, people and brands in ${info.name} script so they read naturally, except keep "Beyond Explored" exactly in English.
- Keep numbers, dates, ₹ amounts, km, emojis, URLs, email addresses and @handles exactly as they are.
- Some items contain markers like ⟦0⟧ ⟦1⟧ that separate pieces of one sentence (for bold words or links). Keep every marker exactly once, in the same ascending order, and put each piece's translation right after its marker.
- Never add notes, quotes or explanations. Return one translation per input, same order, via the tool.`;
  const res = await fetch(process.env.ANTHROPIC_BASE ?? 'https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL(),
      max_tokens: 8000,
      system,
      tools: [{ name: 'translations', description: 'Return the translations', input_schema: { type: 'object', properties: { items: { type: 'array', items: { type: 'string' } } }, required: ['items'] } }],
      tool_choice: { type: 'tool', name: 'translations' },
      messages: [{ role: 'user', content: `Translate these ${items.length} items:\n${JSON.stringify(items)}` }],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  const block = (j.content ?? []).find((c: { type: string }) => c.type === 'tool_use');
  const arr = block?.input?.items;
  if (!Array.isArray(arr) || arr.length !== items.length) throw new Error('Translation came back in the wrong shape');
  return arr;
}
