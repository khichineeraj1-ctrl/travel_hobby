'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { openAsk } from './AskBeyond';

type Hit = { name: string; sub: string; href: string; external: boolean; kind: 'guide' | 'gem' };

const EXAMPLES = [
  'waterfalls in Meghalaya',
  'forts in Rajasthan in December',
  'treks in Himachal in May',
  'beaches in Karnataka',
  'monasteries in Sikkim',
  'snow in January',
];

/** Big home search: type-ahead over guides + hidden gems; Enter goes to /explore with the query. */
export function HomeSearch({ total, states, chips, ask }: { total: number; states: number; chips: { label: string; href: string }[]; ask: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [understood, setUnderstood] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [ph, setPh] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  // rotate the placeholder so people see what they can type
  useEffect(() => { const t = setInterval(() => setPh((i) => (i + 1) % EXAMPLES.length), 2800); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); setUnderstood([]); setCount(0); return; }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctl.signal })
        .then((r) => r.json())
        .then((j) => { setHits(j.items ?? []); setUnderstood(j.understood ?? []); setCount(j.total ?? 0); setActive(-1); })
        .catch(() => {});
    }, 180);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const go = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (active >= 0 && hits[active]) {
      const h = hits[active];
      if (h.external) window.open(h.href, '_blank', 'noopener'); else router.push(h.href);
      return;
    }
    router.push(q.trim() ? `/explore?q=${encodeURIComponent(q.trim())}` : '/explore');
  };

  return (
    <div ref={box} className="relative mx-auto w-full max-w-2xl">
      <div className="relative">
      <form onSubmit={go} role="search" className="flex items-center gap-2 rounded-full bg-white p-1.5 pl-5 shadow-tilehover ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-blue">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-mute" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(hits.length - 1, a + 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder={`Try “${EXAMPLES[ph]}”`}
          aria-label="Search places, states, months or vibes"
          aria-autocomplete="list" aria-expanded={open && hits.length > 0} aria-controls="home-search-list"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-base outline-none placeholder:text-faint sm:text-[17px]"
        />
        {ask && (
          <button type="button" onClick={() => openAsk(q || undefined)} aria-label="Ask by voice" title="Ask by voice" className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full text-mute hover:bg-paper hover:text-ink sm:flex">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
          </button>
        )}
        <button className="btn btn-sm shrink-0 !px-5">Search</button>
      </form>
      {open && q.trim().length >= 2 && (
        <div id="home-search-list" role="listbox" className="absolute inset-x-0 top-full z-30 mt-2 max-h-[70vh] overflow-y-auto rounded-3xl bg-white text-left shadow-tilehover ring-1 ring-black/5">
          {understood.length > 0 && <p className="border-b border-line/70 px-5 py-2 text-xs text-mute">Looking for: <b className="text-ink">{understood.join(' · ')}</b></p>}
          {hits.length === 0 ? (
            <p className="px-5 py-4 text-[15px] text-mute">No exact matches — press Enter to search more widely{ask ? ', or ask our voice guide' : ''}.</p>
          ) : (
            <ul>
              {hits.map((h, i) => (
                <li key={h.href} role="option" aria-selected={i === active}>
                  <a
                    href={h.href} target={h.external ? '_blank' : undefined} rel={h.external ? 'noreferrer' : undefined}
                    onMouseEnter={() => setActive(i)}
                    className={`flex items-center gap-3 px-5 py-3 ${i === active ? 'bg-paper' : ''}`}
                  >
                    <span className="text-lg" aria-hidden>{h.kind === 'guide' ? '⛰️' : '💎'}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{h.name}</span>
                      <span className="block truncate text-sm text-mute">{h.sub}</span>
                    </span>
                    {h.external && <span className="text-xs text-faint">Maps ↗</span>}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => go()} className="block w-full border-t border-line/70 px-5 py-3 text-left text-[15px] text-blue-link hover:bg-paper">
            See all {count > 7 ? count : ''} results for “{q.trim()}” ›
          </button>
        </div>
      )}

      </div>

      <div className="no-scrollbar -mx-5 mt-4 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <div className="mx-auto flex w-max gap-2 pb-1 sm:w-auto sm:flex-wrap sm:justify-center">
          {chips.map((c) => <Link key={c.href} href={c.href} className="chip shrink-0 !bg-white/80 !py-1.5 !text-sm">{c.label}</Link>)}
        </div>
      </div>
    </div>
  );
}
