'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LANGS, langInfo } from '@/lib/langs';

/** 🌐 language picker. Choosing one remembers it and stops auto-detection. */
export function LangSwitcher({ lang, compact }: { lang: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const path = usePathname() || '/';
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const cur = langInfo(lang);
  return (
    <div ref={box} className="relative" data-no-tr>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} aria-label="Change language"
        className="flex items-center gap-1 rounded-full px-2 py-1 hover:bg-black/5 hover:text-ink">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" /></svg>
        {!compact && <span>{cur.native}</span>}
      </button>
      {open && (
        <ul role="listbox" className="absolute right-0 top-full z-50 mt-2 max-h-[70vh] w-48 overflow-y-auto rounded-2xl bg-white py-2 text-[15px] shadow-tilehover ring-1 ring-black/5">
          {LANGS.map((l) => (
            <li key={l.code} role="option" aria-selected={l.code === lang}>
              <a href={`/api/lang?l=${l.code}&next=${encodeURIComponent(path)}`} lang={l.code} className={`flex items-center justify-between px-4 py-2 hover:bg-paper ${l.code === lang ? 'font-semibold' : ''}`}>
                <span>{l.native}</span><span className="text-xs text-faint">{l.name}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** One-time note after we switched language automatically from the visitor's location. */
export function AutoLangNote({ lang, region }: { lang: string; region: string }) {
  const [show, setShow] = useState(true);
  const path = usePathname() || '/';
  if (!show || lang === 'en') return null;
  const dismiss = () => { document.cookie = 'be_auto=; Max-Age=0; path=/'; setShow(false); };
  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-tilehover sm:bottom-5">
      <span className="min-w-0 flex-1">🌐 <span data-no-tr>{langInfo(lang).native}</span>{region && region !== '1' ? <> — {decodeURIComponent(region)}</> : null}</span>
      <a href={`/api/lang?l=en&next=${encodeURIComponent(path)}`} className="shrink-0 rounded-full bg-white/15 px-3 py-1 hover:bg-white/25" data-no-tr>English</a>
      <button type="button" onClick={dismiss} aria-label="OK" className="shrink-0 rounded-full bg-white px-3 py-1 font-semibold text-ink" data-no-tr>OK</button>
    </div>
  );
}
