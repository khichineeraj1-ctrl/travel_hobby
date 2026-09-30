'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type Msg = { text: string; label?: string; href?: string; quiet?: boolean };

const DEFAULT: Msg = { text: 'Can’t decide? Tell us 4 things and get matches — or let the dice pick.', label: 'Plan my trip', href: '/plan-my-trip' };
const KEY = 'be-guide-off';

function current(): Msg | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-guide]'));
  if (!els.length) return null;
  const line = window.innerHeight * 0.55;
  // the last annotated section whose top has crossed the reading line (gaps between sections keep the previous message)
  let hit: HTMLElement | null = null;
  for (const el of els) if (el.getBoundingClientRect().top <= line) hit = el;
  if (!hit) return null;
  const d = hit.dataset;
  return { text: d.guide ?? '', label: d.guideCta, href: d.guideHref, quiet: d.guideQuiet === '1' };
}

/** Floating guide that changes what it says based on what's on screen. Collapses to the 🎲 when dismissed. */
export function Guide() {
  const path = usePathname();
  const [msg, setMsg] = useState<Msg | null>(null);
  const [ready, setReady] = useState(false);
  const [off, setOff] = useState(false);
  const [typing, setTyping] = useState(false);
  const ticking = useRef(false);

  useEffect(() => {
    try { setOff(sessionStorage.getItem(KEY) === '1'); } catch { /* storage blocked */ }
  }, []);

  useEffect(() => {
    setReady(false);
    const update = () => {
      ticking.current = false;
      if (window.scrollY > 240) setReady(true);
      setMsg(current());
    };
    const onScroll = () => { if (!ticking.current) { ticking.current = true; requestAnimationFrame(update); } };
    const t = setTimeout(() => { setReady(true); update(); }, 6000); // talk after a moment even if they don't scroll
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    const focus = (e: FocusEvent) => setTyping(!!(e.target as HTMLElement)?.closest?.('input, textarea, select'));
    document.addEventListener('focusin', focus);
    document.addEventListener('focusout', () => setTyping(false));
    return () => { clearTimeout(t); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); document.removeEventListener('focusin', focus); };
  }, [path]);

  if (path?.startsWith('/admin')) return null;
  const m = msg ?? DEFAULT;
  const show = ready && !off && !typing && !m.quiet && !!m.text;

  const dismiss = () => { setOff(true); try { sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ } };
  const reopen = () => { setOff(false); setReady(true); try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } };

  return (
    <>
      <div
        className={`fixed inset-x-3 bottom-3 z-40 mx-auto max-w-[640px] transition duration-300 sm:bottom-5 ${show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'}`}
        role="status" aria-live="polite"
      >
        <div className="flex items-center gap-3 rounded-[22px] bg-ink/95 py-2.5 pl-3 pr-2 text-white shadow-tilehover backdrop-blur">
          <span aria-hidden className="brand-dot h-8 w-8 shrink-0 rounded-full" />
          <p key={m.text} className="guide-in min-w-0 flex-1 text-[14px] leading-snug sm:text-[15px]">{m.text}</p>
          {m.label && m.href && (
            m.href.startsWith('#')
              ? <a href={m.href} className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold text-ink hover:bg-white/90 sm:text-sm">{m.label}</a>
              : <Link href={m.href} prefetch={false} className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold text-ink hover:bg-white/90 sm:text-sm">{m.label}</Link>
          )}
          <Link href="/roll" prefetch={false} title="Surprise me" aria-label="Surprise me with a destination" className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg hover:bg-white/20 sm:flex">🎲</Link>
          <button onClick={dismiss} aria-label="Hide tips" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white">×</button>
        </div>
      </div>
      {/* when the guide isn't talking: just the dice (plus a way to bring the guide back if dismissed) */}
      <div className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 transition ${!show && !typing ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
        {off && <button onClick={reopen} className="rounded-full bg-white px-3 py-2 text-xs text-mute shadow-tile ring-1 ring-black/5 hover:text-ink">tips</button>}
        <Link href="/roll" prefetch={false} aria-label="Surprise me with a destination" className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl shadow-tilehover ring-1 ring-black/5 transition hover:scale-105">🎲</Link>
      </div>
    </>
  );
}
