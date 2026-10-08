'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { draftWithAI, saveNote } from '@/app/studio/actions';
import { noteChecklist } from '@/lib/noteRules';
import type { NoteDoc, NotePhotoDoc, NoteSection } from '@/lib/types';

type State = { slug: string; name: string };

async function upload(file: File, kind: 'cover' | 'photo'): Promise<NotePhotoDoc> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('kind', kind);
  const r = await fetch('/api/studio/upload', { method: 'POST', body: fd });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'Upload failed');
  return { src: j.src, alt: '', wide: j.width > j.height };
}

const Label = ({ children, hint }: { children: React.ReactNode; hint?: string }) => (
  <span className="mb-1.5 block text-sm font-medium">{children}{hint && <span className="mt-0.5 block text-xs font-normal text-faint">{hint}</span>}</span>
);

function PhotoTile({ p, onChange, onRemove }: { p: NotePhotoDoc; onChange: (p: NotePhotoDoc) => void; onRemove: () => void }) {
  return (
    <div className="card overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.src} alt="" className="aspect-[4/3] w-full object-cover" />
      <div className="space-y-2 p-3">
        <input className="field !py-2 text-sm" placeholder="Describe the photo (alt text) *" value={p.alt} onChange={(e) => onChange({ ...p, alt: e.target.value })} />
        <input className="field !py-2 text-sm" placeholder="Caption (optional)" value={p.caption ?? ''} onChange={(e) => onChange({ ...p, caption: e.target.value })} />
        <button type="button" onClick={onRemove} className="text-xs text-[#d70015] hover:underline">Remove photo</button>
      </div>
    </div>
  );
}

function UploadButton({ kind, onDone, label, multiple }: { kind: 'cover' | 'photo'; onDone: (p: NotePhotoDoc) => void; label: string; multiple?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  return (
    <span>
      <input ref={ref} type="file" accept="image/*" multiple={multiple} className="hidden" onChange={async (e) => {
        const files = [...(e.target.files ?? [])];
        if (!files.length) return;
        setBusy(true); setErr('');
        for (const f of files) {
          try { onDone(await upload(f, kind)); } catch (x) { setErr((x as Error).message); }
        }
        setBusy(false);
        if (ref.current) ref.current.value = '';
      }} />
      <button type="button" disabled={busy} onClick={() => ref.current?.click()} className="btn-secondary btn-sm">{busy ? 'Uploading…' : label}</button>
      {err && <span className="ml-2 text-sm text-[#d70015]">{err}</span>}
    </span>
  );
}

function PairList({ items, onChange, qLabel, aLabel, min, long }: { items: { q: string; a: string }[]; onChange: (v: { q: string; a: string }[]) => void; qLabel: string; aLabel: string; min: number; long?: boolean }) {
  return (
    <div className="space-y-3">
      {items.map((x, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1.3fr_auto]">
          <input className="field" placeholder={qLabel} value={x.q} onChange={(e) => onChange(items.map((y, j) => (j === i ? { ...y, q: e.target.value } : y)))} />
          {long
            ? <textarea rows={2} className="field" placeholder={aLabel} value={x.a} onChange={(e) => onChange(items.map((y, j) => (j === i ? { ...y, a: e.target.value } : y)))} />
            : <input className="field" placeholder={aLabel} value={x.a} onChange={(e) => onChange(items.map((y, j) => (j === i ? { ...y, a: e.target.value } : y)))} />}
          <button type="button" disabled={items.length <= min} onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-sm text-mute hover:text-[#d70015] disabled:opacity-30">Remove</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { q: '', a: '' }])} className="text-sm text-blue-link hover:underline">+ Add another</button>
    </div>
  );
}

export function NoteEditor({ initial, states, bioOk, admin, locked, ai }: { initial: NoteDoc; states: State[]; bioOk: boolean; admin: boolean; locked: boolean; ai: boolean }) {
  const [d, setD] = useState<NoteDoc>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [dirty, setDirty] = useState(false);
  const set = (patch: Partial<NoteDoc>) => { setD((x) => ({ ...x, ...patch })); setDirty(true); };
  const setSection = (i: number, patch: Partial<NoteSection>) => set({ sections: d.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const checks = useMemo(() => noteChecklist(d, bioOk), [d, bioOk]);
  const done = checks.filter((c) => c.ok).length;

  const go = (intent: 'save' | 'submit') => start(async () => {
    const r = await saveNote(d.id, d, intent);
    setMsg({ ok: r.ok, text: r.msg });
    if (r.ok) { setDirty(false); if (r.status) setD((x) => ({ ...x, status: r.status! })); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  const readOnly = locked && !admin;
  const [drafting, setDrafting] = useState(false);
  const hasContent = !!(d.intro.trim() || d.sections.some((s) => s.body.trim()));
  const ctxWords = (d.context ?? '').trim().split(/\s+/).filter(Boolean).length;
  const draft = async () => {
    if (hasContent && !window.confirm('This replaces the text you have now with a fresh draft. Continue?')) return;
    setDrafting(true); setMsg(null);
    const r = await draftWithAI(d.id, d.context ?? '', d.pool ?? []);
    setDrafting(false);
    setMsg({ ok: r.ok, text: r.msg });
    if (r.ok && r.note) { setD(r.note); setDirty(false); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-8">
        {msg && <p role="status" className={`rounded-2xl px-5 py-3 text-[15px] ${msg.ok ? 'bg-[#e3f9e5] text-[#1a7f37]' : 'bg-[#fff4e5] text-[#9a4b00]'}`}>{msg.text}</p>}
        {d.reviewNote && d.status === 'changes' && (
          <div className="rounded-2xl bg-blue-soft px-5 py-4 text-[15px]"><b>Notes from the editor:</b><p className="mt-1 whitespace-pre-line">{d.reviewNote}</p></div>
        )}
        {readOnly && <p className="rounded-2xl bg-paper px-5 py-3 text-[15px] text-mute">{d.status === 'pending' ? 'This note is with the editor. You can edit again if it’s sent back.' : 'This note is live. Ask the editor if something needs changing.'}</p>}

        <fieldset disabled={readOnly} className="space-y-8">
          {ai && (
            <section className="card space-y-4 border-2 border-[#0071e3]/20 p-6">
              <div>
                <p className="kicker">Start here</p>
                <h2 className="text-xl font-semibold">Tell us about your trip — we’ll draft it for you</h2>
                <p className="mt-1 text-sm text-mute">Write it like a WhatsApp message to a friend: where you went and when, how you got there, where you stayed and ate, what it cost, what surprised you, what you’d do differently. Add your photos. Our AI editor turns it into a polished field note in our house style — using only what you tell it. Then you check and polish.</p>
              </div>
              <textarea rows={8} className="field leading-relaxed" placeholder="We went to Jim Corbett in early October 2026, drove from Delhi via Moradabad (about 5 hours)…" value={d.context ?? ''} onChange={(e) => set({ context: e.target.value })} />
              <div>
                <Label hint="Up to 10 photos. Add a few words on what each shows if it isn’t obvious.">Your photos</Label>
                {(d.pool ?? []).length > 0 && (
                  <div className="mb-3 grid gap-3 sm:grid-cols-4">
                    {(d.pool ?? []).map((p, k) => (
                      <div key={p.src} className="card overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.src} alt="" className="aspect-square w-full object-cover" />
                        <div className="space-y-1 p-2">
                          <input className="field !py-1.5 text-xs" placeholder="What is this? (optional)" value={p.caption ?? ''} onChange={(e) => set({ pool: (d.pool ?? []).map((x, j) => (j === k ? { ...x, caption: e.target.value } : x)) })} />
                          <button type="button" onClick={() => set({ pool: (d.pool ?? []).filter((_, j) => j !== k) })} className="text-xs text-[#d70015] hover:underline">Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {(d.pool ?? []).length < 10 && <UploadButton kind="photo" multiple label="Add photos" onDone={(p) => setD((x) => ({ ...x, pool: [...(x.pool ?? []), p].slice(0, 10) }))} />}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={draft} disabled={drafting || ctxWords < 60 || !(d.pool ?? []).length} className="btn disabled:opacity-40">{drafting ? 'Drafting… (about a minute)' : hasContent ? '✨ Redraft it for me' : '✨ Draft it for me'}</button>
                <span className="text-sm text-mute">{ctxWords < 60 ? `${60 - ctxWords} more words to go` : !(d.pool ?? []).length ? 'Add at least one photo' : 'Ready'}{(d.drafts ?? 0) > 0 ? ` · ${5 - (d.drafts ?? 0)} drafts left` : ''}</span>
              </div>
            </section>
          )}

          {(d.gaps ?? []).length > 0 && (
            <section className="rounded-2xl bg-[#fff4e5] p-5 text-[15px] text-[#7a3e00]">
              <p className="font-semibold">The draft needs a few facts only you know:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">{(d.gaps ?? []).map((g) => <li key={g}>{g}</li>)}</ul>
              <p className="mt-2 text-sm">Add them in the text below (or to your trip notes and redraft).</p>
            </section>
          )}
          <section className="card space-y-4 p-6">
            <h2 className="text-lg font-semibold">The basics</h2>
            <label className="block"><Label hint="Say what the reader gets. e.g. “Jim Corbett, done right: the zone calendar nobody tells you about”">Title</Label>
              <input className="field text-lg" value={d.title} onChange={(e) => set({ title: e.target.value })} maxLength={120} /></label>
            <label className="block"><Label hint={`What Google shows under the title — answer the main question in one line. ${d.description.length}/160`}>Search summary</Label>
              <textarea rows={2} className="field" value={d.description} onChange={(e) => set({ description: e.target.value })} maxLength={200} /></label>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block"><Label>Place</Label><input className="field" placeholder="Jim Corbett" value={d.place} onChange={(e) => set({ place: e.target.value })} /></label>
              <label className="block"><Label>State</Label>
                <select className="field" value={d.stateSlug} onChange={(e) => set({ stateSlug: e.target.value })}>
                  <option value="">Choose…</option>{states.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                </select></label>
              <label className="block"><Label>When you went</Label><input className="field" placeholder="October 2026" value={d.visited} onChange={(e) => set({ visited: e.target.value })} /></label>
            </div>
            <label className="block"><Label hint="Hook the reader in 3–5 sentences: what most people get wrong, what you found. Blank line = new paragraph. **word** = bold.">Intro</Label>
              <textarea rows={5} className="field leading-relaxed" value={d.intro} onChange={(e) => set({ intro: e.target.value })} /></label>
            <div>
              <Label hint="Your best landscape photo. We crop it to 16:9 for Google Discover and sharing.">Cover photo</Label>
              {d.cover
                ? <div className="max-w-sm"><PhotoTile p={d.cover} onChange={(p) => set({ cover: p })} onRemove={() => set({ cover: undefined })} /></div>
                : <UploadButton kind="cover" label="Upload cover photo" onDone={(p) => set({ cover: p })} />}
            </div>
          </section>

          <section className="card space-y-4 p-6">
            <h2 className="text-lg font-semibold">Quick answers</h2>
            <p className="text-sm text-mute">The short answers people (and AI search) look for. One line each — e.g. “When does Bijrani open?” → “15 October.”</p>
            <PairList items={d.quick} onChange={(quick) => set({ quick })} qLabel="Question" aLabel="Short answer" min={1} />
          </section>

          {d.sections.map((s, i) => (
            <section key={i} className="card space-y-4 p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Section {i + 1}</h2>
                <div className="flex gap-3 text-sm">
                  <button type="button" disabled={i === 0} onClick={() => { const a = [...d.sections]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; set({ sections: a }); }} className="text-mute hover:text-ink disabled:opacity-30">↑</button>
                  <button type="button" disabled={i === d.sections.length - 1} onClick={() => { const a = [...d.sections]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; set({ sections: a }); }} className="text-mute hover:text-ink disabled:opacity-30">↓</button>
                  <button type="button" disabled={d.sections.length <= 1} onClick={() => set({ sections: d.sections.filter((_, j) => j !== i) })} className="text-mute hover:text-[#d70015] disabled:opacity-30">Remove</button>
                </div>
              </div>
              <label className="block"><Label hint="A question people actually type: “Where should I stay…?”, “Which zone…?”, “Ideas for…”">Heading</Label>
                <input className="field text-lg font-semibold" value={s.heading} onChange={(e) => setSection(i, { heading: e.target.value })} /></label>
              <label className="block"><Label hint="Optional one-liner above the heading, in your voice — e.g. “If you want the stripes, sleep inside the forest”">Kicker</Label>
                <input className="field" value={s.kicker ?? ''} onChange={(e) => setSection(i, { kicker: e.target.value })} /></label>
              <label className="block"><Label hint="Answer first, then the story. What you saw, what it cost, the catch, what you’d do differently. Only what you experienced.">Text</Label>
                <textarea rows={8} className="field leading-relaxed" value={s.body} onChange={(e) => setSection(i, { body: e.target.value })} /></label>
              <div>
                <Label hint="Your own photos only.">Photos</Label>
                {s.photos.length > 0 && (
                  <div className="mb-3 grid gap-3 sm:grid-cols-3">
                    {s.photos.map((p, k) => (
                      <PhotoTile key={p.src} p={p}
                        onChange={(np) => setSection(i, { photos: s.photos.map((x, j) => (j === k ? np : x)) })}
                        onRemove={() => setSection(i, { photos: s.photos.filter((_, j) => j !== k) })} />
                    ))}
                  </div>
                )}
                {s.photos.length < 6 && <UploadButton kind="photo" multiple label="Add photos" onDone={(p) => setD((x) => ({ ...x, sections: x.sections.map((ss, j) => (j === i ? { ...ss, photos: [...ss.photos, p].slice(0, 6) } : ss)) }))} />}
              </div>
            </section>
          ))}
          <button type="button" onClick={() => set({ sections: [...d.sections, { kicker: '', heading: '', body: '', photos: [] }] })} className="btn-secondary w-full justify-center">+ Add a section</button>

          <section className="card space-y-4 p-6">
            <h2 className="text-lg font-semibold">FAQ</h2>
            <p className="text-sm text-mute">Full-sentence answers to the questions people Google. These can show up directly in Google results.</p>
            <PairList items={d.faq} onChange={(faq) => set({ faq })} qLabel="Question people ask" aLabel="Answer in 1–3 sentences" min={1} long />
          </section>

          <section className="card space-y-4 p-6">
            <h2 className="text-lg font-semibold">Sources (optional, recommended)</h2>
            <p className="text-sm text-mute">Official pages you checked dates, prices or rules against.</p>
            {d.sources.map((x, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1.3fr_auto]">
                <input className="field" placeholder="Official Corbett booking site" value={x.label} onChange={(e) => set({ sources: d.sources.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)) })} />
                <input className="field" placeholder="https://…" value={x.href} onChange={(e) => set({ sources: d.sources.map((y, j) => (j === i ? { ...y, href: e.target.value } : y)) })} />
                <button type="button" onClick={() => set({ sources: d.sources.filter((_, j) => j !== i) })} className="text-sm text-mute hover:text-[#d70015]">Remove</button>
              </div>
            ))}
            <button type="button" onClick={() => set({ sources: [...d.sources, { label: '', href: '' }] })} className="text-sm text-blue-link hover:underline">+ Add a source</button>
            <label className="block"><Label hint="Other words people might search for this — nearby towns, attractions, restaurants.">Search keywords (optional)</Label>
              <input className="field" value={d.keywords} onChange={(e) => set({ keywords: e.target.value })} /></label>
          </section>

          <label className="card flex items-start gap-3 p-5 text-[15px]">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-[#0071e3]" checked={!!d.photoConsent} onChange={(e) => set({ photoConsent: e.target.checked })} />
            <span>I took these photos myself (or have permission), they don’t show children’s faces or readable number plates, and everything I wrote is from my own trip.</span>
          </label>
        </fieldset>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="card p-5">
          <p className="text-sm text-mute">Status</p>
          <p className="text-lg font-semibold capitalize">{d.status === 'changes' ? 'Changes requested' : d.status === 'pending' ? 'In review' : d.status}</p>
          {!readOnly && (
            <div className="mt-4 space-y-2">
              <button type="button" disabled={pending} onClick={() => go('save')} className="btn-secondary w-full justify-center">{pending ? 'Saving…' : dirty ? 'Save draft' : 'Saved'}</button>
              {!admin && <button type="button" disabled={pending || done < checks.length} onClick={() => go('submit')} className="btn w-full justify-center disabled:opacity-40">Submit for review</button>}
            </div>
          )}
          <a href={`/studio/notes/${d.id}/preview`} target="_blank" rel="noreferrer" className="mt-3 block text-center text-sm text-blue-link hover:underline">Preview (save first) ↗</a>
        </div>
        <div className="card p-5">
          <p className="font-semibold">Ready to submit? {done}/{checks.length}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper"><div className="h-full bg-[#1a7f37]" style={{ width: `${(done / checks.length) * 100}%` }} /></div>
          <ul className="mt-3 space-y-1.5 text-[13px]">
            {checks.map((c) => <li key={c.label} className={c.ok ? 'text-[#1a7f37]' : 'text-mute'}>{c.ok ? '✓' : '○'} {c.label}</li>)}
          </ul>
        </div>
      </aside>
    </div>
  );
}
