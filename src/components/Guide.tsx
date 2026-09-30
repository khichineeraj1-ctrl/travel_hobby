'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { openAsk } from './AskBeyond';

type Msg = { text: string; label?: string; href?: string; quiet?: boolean };

const KEY = 'be-guide-off';
const SESSION_COUNT = 'be-guide-n';

/* When the guide is allowed to speak — it should feel like a friend noticing what you're doing, not a popup. */
const RULES = {
  firstDelayMs: 12_000,  // never in the first 12 s on a page: let them look around
  dwellMs: 6_000,        // they've stayed on the same section this long…
  idleMs: 2_500,         // …and stopped scrolling (they're reading, not skimming)
  showForMs: 9_000,      // then it speaks for ~9 s and goes away on its own
  gapMs: 20_000,         // at least 20 s of quiet between two messages
  perPage: 3,            // at most 3 messages per page
  perSession: 8,         // and 8 per visit
  busyMs: 15_000,        // stay quiet for 15 s after they click/tap something themselves
};

function sectionAt(): { key: string; msg: Msg } | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-guide]'));
  const line = window.innerHeight * 0.5;
  // the section under the middle of the screen (gaps keep the previous section)
  let hit: HTMLElement | null = null;
  for (const el of els) if (el.getBoundingClientRect().top <= line) hit = el;
  if (!hit) return null;
  const d = hit.dataset;
  return { key: d.guide || 'quiet', msg: { text: d.guide ?? '', label: d.guideCta, href: d.guideHref, quiet: d.guideQuiet === '1' } };
}

/**
 * Contextual guide. Stays silent while you scroll or click around; when you pause on a section
 * (or are about to leave), it says one thing relevant to exactly that section, then gets out of the way.
 */
export function Guide({ ask = false }: { ask?: boolean }) {
  const path = usePathname();
  const [msg, setMsg] = useState<Msg | null>(null);
  const [visible, setVisible] = useState(false);
  const [off, setOff] = useState(false);
  const [typing, setTyping] = useState(false);
  const hovering = useRef(false);

  useEffect(() => {
    try { setOff(sessionStorage.getItem(KEY) === '1'); } catch { /* storage blocked */ }
  }, []);

  useEffect(() => {
    setVisible(false);
    const start = Date.now();
    let section: string | null = null;
    let sectionSince = start;
    let lastScroll = start;
    let lastScrollY = window.scrollY;
    let lastAction = 0;
    let lastHidden = 0;
    let shownAt = 0;
    let shownY = 0;
    let shownHere = 0;
    const said = new Set<string>();
    let isVisible = false;
    let exitSaid = false;

    const sessionCount = () => { try { return Number(sessionStorage.getItem(SESSION_COUNT) || 0); } catch { return 0; } };
    const bump = () => { try { sessionStorage.setItem(SESSION_COUNT, String(sessionCount() + 1)); } catch { /* */ } };
    const hide = () => { if (isVisible) { isVisible = false; lastHidden = Date.now(); setVisible(false); } };
    const say = (m: Msg, key: string) => {
      said.add(key); shownHere++; bump();
      shownAt = Date.now(); shownY = window.scrollY; isVisible = true;
      setMsg(m); setVisible(true);
    };
    const allowed = (now: number) =>
      now - start > RULES.firstDelayMs && now - lastHidden > RULES.gapMs && now - lastAction > RULES.busyMs &&
      shownHere < RULES.perPage && sessionCount() < RULES.perSession;

    const tick = () => {
      const now = Date.now();
      const cur = sectionAt();
      const key = cur?.key ?? null;
      if (key !== section) { section = key; sectionSince = now; }

      if (isVisible) {
        const scrolledAway = Math.abs(window.scrollY - shownY) > window.innerHeight * 0.6;
        if (!hovering.current && (now - shownAt > RULES.showForMs || scrolledAway)) hide();
        return;
      }
      if (!cur || cur.msg.quiet || !cur.msg.text || said.has(cur.key)) return;
      if (!allowed(now)) return;
      const settled = now - lastScroll > RULES.idleMs && now - sectionSince > RULES.dwellMs;
      if (settled) say(cur.msg, cur.key);
    };

    const onScroll = () => {
      const y = window.scrollY;
      const now = Date.now();
      // reached the bottom of the page = about to leave → the page's last section speaks (once)
      const atEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 40;
      if (atEnd && !exitSaid && y > lastScrollY) {
        exitSaid = true;
        const cur = sectionAt();
        if (cur && !cur.msg.quiet && cur.msg.text && !said.has(cur.key) && now - lastAction > RULES.busyMs && shownHere < RULES.perPage && sessionCount() < RULES.perSession && now - start > 4000) {
          say(cur.msg, cur.key);
        }
      }
      lastScroll = now; lastScrollY = y;
    };
    // desktop exit intent: pointer heads for the tabs/close button
    const onLeave = (e: MouseEvent) => {
      if (e.clientY > 8 || exitSaid) return;
      exitSaid = true;
      const now = Date.now();
      if (isVisible || now - start < 6000 || shownHere >= RULES.perPage || sessionCount() >= RULES.perSession) return;
      const last = Array.from(document.querySelectorAll<HTMLElement>('[data-guide]')).filter((el) => el.dataset.guide && el.dataset.guideQuiet !== '1').pop();
      if (last && !said.has(last.dataset.guide!)) say({ text: last.dataset.guide!, label: last.dataset.guideCta, href: last.dataset.guideHref }, last.dataset.guide!);
    };
    const onAction = (e: Event) => {
      if ((e.target as HTMLElement)?.closest?.('.guide-bar')) return;
      lastAction = Date.now();
      hide();
    };
    const focus = (e: FocusEvent) => setTyping(!!(e.target as HTMLElement)?.closest?.('input, textarea, select'));
    const blur = () => setTyping(false);

    const iv = setInterval(tick, 500);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('pointerdown', onAction, true);
    document.addEventListener('focusin', focus);
    document.addEventListener('focusout', blur);
    return () => {
      clearInterval(iv);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('pointerdown', onAction, true);
      document.removeEventListener('focusin', focus);
      document.removeEventListener('focusout', blur);
    };
  }, [path]);

  if (path?.startsWith('/admin')) return null;
  const m = msg;
  const show = visible && !!m && !off && !typing;

  const dismiss = () => { setOff(true); try { sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ } };
  const reopen = () => {
    setOff(false);
    try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
    const cur = sectionAt();
    if (cur?.msg.text && !cur.msg.quiet) { setMsg(cur.msg); setVisible(true); }
  };

  return (
    <>
      <div
        className={`guide-bar fixed inset-x-3 bottom-3 z-40 mx-auto max-w-[640px] transition duration-300 sm:bottom-5 ${show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'}`}
        role="status" aria-live="polite"
        onMouseEnter={() => { hovering.current = true; }} onMouseLeave={() => { hovering.current = false; }}
      >
        <div className="rounded-[22px] bg-ink/95 p-3 text-white shadow-tilehover backdrop-blur sm:flex sm:items-center sm:gap-3 sm:py-2.5 sm:pl-3 sm:pr-2">
          {/* phones: message row on top, actions underneath; desktop: one row */}
          <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
            <span aria-hidden className="brand-dot mt-0.5 h-7 w-7 shrink-0 rounded-full sm:mt-0 sm:h-8 sm:w-8" />
            <p key={m?.text} className="guide-in min-w-0 flex-1 text-[14px] leading-snug sm:text-[15px]">{m?.text}</p>
            <button onClick={dismiss} aria-label="Hide tips" className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white sm:hidden">×</button>
          </div>
          <div className="mt-2.5 flex items-center justify-end gap-2 sm:mt-0 sm:shrink-0">
            {ask && <button onClick={() => openAsk()} title="Ask by voice" aria-label="Ask Beyond by voice" className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-white/10 px-3 text-[13px] hover:bg-white/20">🎙️ Ask</button>}
            <Link href="/roll" prefetch={false} title="Surprise me" aria-label="Surprise me with a destination" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-base hover:bg-white/20">🎲</Link>
            {m?.label && m.href && (
              m.href.startsWith('#')
                ? <a href={m.href} className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold text-ink hover:bg-white/90 sm:text-sm">{m.label}</a>
                : <Link href={m.href} prefetch={false} className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold text-ink hover:bg-white/90 sm:text-sm">{m.label}</Link>
            )}
            <button onClick={dismiss} aria-label="Hide tips" className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white sm:flex">×</button>
          </div>
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
