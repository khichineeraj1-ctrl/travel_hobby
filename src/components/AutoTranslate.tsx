'use client';

import { useEffect } from 'react';

/**
 * Translates the rendered page in place for non-English visitors.
 * Each block of text (a paragraph, heading, button…) is sent as one unit so grammar stays natural; bold/link pieces
 * inside it are kept apart with ⟦n⟧ markers and written back into the same DOM nodes — so React keeps working.
 * Translations come from our server cache (/api/i18n); anything new is translated there in the background.
 */
const INLINE = new Set(['B', 'STRONG', 'I', 'EM', 'SMALL', 'SPAN', 'TIME', 'A', 'ABBR', 'MARK', 'SUP', 'SUB', 'U', 'S', 'LABEL', 'BR', 'WBR']);
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA', 'SVG', 'INPUT', 'SELECT', 'IFRAME', 'TEMPLATE']);
const ATTRS = ['placeholder', 'aria-label', 'title', 'alt'] as const;
const HAS_WORDS = /[A-Za-z]{2}/;
const STORE = (lang: string) => `be_tr_${lang}`;

type Unit = { key: string; nodes: Text[]; pads: [string, string][] };

function skipNode(el: Element | null): boolean {
  for (let e = el; e; e = e.parentElement) {
    if (SKIP.has(e.tagName) || e.hasAttribute('data-no-tr') || e.getAttribute('translate') === 'no') return true;
  }
  return false;
}

function blockOf(n: Node): Element {
  let e = n.parentElement!;
  while (e.parentElement && INLINE.has(e.tagName)) e = e.parentElement;
  return e;
}

export function AutoTranslate({ lang }: { lang: string }) {
  useEffect(() => {
    const root = document.documentElement;
    if (lang === 'en') { root.classList.remove('be-tr-pending'); return; }
    let mem: Record<string, string> = {};
    try { mem = JSON.parse(localStorage.getItem(STORE(lang)) || '{}'); } catch { mem = {}; }
    const done = new WeakMap<Node, string>(); // node → the text we wrote
    const attrDone = new WeakMap<Element, Record<string, string>>();
    let writing = false;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reveal = () => root.classList.remove('be-tr-pending');
    const failSafe = setTimeout(reveal, 1500);

    const persist = () => {
      try {
        const s = JSON.stringify(mem);
        if (s.length < 2_500_000) localStorage.setItem(STORE(lang), s); else localStorage.removeItem(STORE(lang));
      } catch { /* storage full or blocked */ }
    };

    function collect() {
      const groups = new Map<Element, Text[]>();
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
        const v = n.nodeValue ?? '';
        if (!HAS_WORDS.test(v) || done.get(n) === v || skipNode(n.parentElement)) continue;
        const b = blockOf(n);
        (groups.get(b) ?? groups.set(b, []).get(b)!).push(n);
      }
      const units: Unit[] = [];
      for (const [b, nodes] of groups) {
        // include already-translated siblings? no — only untranslated text in this block
        const all: Text[] = [];
        const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode() as Text | null; n; n = w.nextNode() as Text | null) {
          if ((n.nodeValue ?? '').trim() && blockOf(n) === b && !skipNode(n.parentElement)) all.push(n);
        }
        const use = all.length > 1 && all.length <= 12 && all.every((n) => done.get(n) !== n.nodeValue) ? all : nodes;
        if (use.length === 1 || use !== all) {
          for (const n of use) {
            const v = n.nodeValue ?? '';
            const m = v.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
            units.push({ key: m[2], nodes: [n], pads: [[m[1], m[3]]] });
          }
        } else {
          const pads: [string, string][] = [];
          const key = use.map((n, i) => {
            const m = (n.nodeValue ?? '').match(/^(\s*)([\s\S]*?)(\s*)$/)!;
            pads.push([m[1], m[3]]);
            return `⟦${i}⟧${m[2]}`;
          }).join('');
          units.push({ key, nodes: use, pads });
        }
      }
      const attrs: { el: Element; name: string; key: string }[] = [];
      document.body.querySelectorAll('[placeholder],[aria-label],[title],img[alt]').forEach((el) => {
        if (skipNode(el.parentElement) || el.hasAttribute('data-no-tr')) return;
        for (const a of ATTRS) {
          const v = el.getAttribute(a);
          if (v && HAS_WORDS.test(v) && attrDone.get(el)?.[a] !== v) attrs.push({ el, name: a, key: v.trim() });
        }
      });
      const metaDesc = document.querySelector('meta[name="description"]');
      return { units, attrs, metaDesc };
    }

    function apply(units: Unit[], attrs: { el: Element; name: string; key: string }[], metaDesc: Element | null) {
      writing = true;
      for (const u of units) {
        const t = mem[u.key];
        if (!t) continue;
        if (u.nodes.length === 1) {
          const out = u.pads[0][0] + t + u.pads[0][1];
          u.nodes[0].nodeValue = out;
          done.set(u.nodes[0], out);
        } else {
          const parts = t.split(/⟦(\d+)⟧/);
          const seg: Record<number, string> = {};
          for (let i = 1; i < parts.length; i += 2) seg[Number(parts[i])] = parts[i + 1] ?? '';
          u.nodes.forEach((n, i) => {
            const out = u.pads[i][0] + (seg[i] ?? '').trim() + u.pads[i][1];
            n.nodeValue = out;
            done.set(n, out);
          });
        }
      }
      for (const a of attrs) {
        const t = mem[a.key];
        if (!t) continue;
        a.el.setAttribute(a.name, t);
        attrDone.set(a.el, { ...(attrDone.get(a.el) ?? {}), [a.name]: t });
      }
      const title = document.title;
      if (mem[title]) document.title = mem[title];
      const d = metaDesc?.getAttribute('content');
      if (d && mem[d]) metaDesc!.setAttribute('content', mem[d]);
      writing = false;
    }

    async function run() {
      const { units, attrs, metaDesc } = collect();
      const outs = new Set(Object.values(mem));
      const want = [...new Set([...units.map((u) => u.key), ...attrs.map((a) => a.key), document.title, metaDesc?.getAttribute('content') ?? ''])]
        .filter((k) => k && HAS_WORDS.test(k) && mem[k] === undefined && !outs.has(k));
      apply(units, attrs, metaDesc); // instant from local memory
      if (!want.length) { reveal(); return; }
      let pending = 0;
      for (let i = 0; i < want.length; i += 500) {
        try {
          const r = await fetch('/api/i18n', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lang, keys: want.slice(i, i + 500) }) });
          const j = await r.json();
          Object.assign(mem, j.t ?? {});
          pending += j.pending ?? 0;
        } catch { /* offline — keep English */ }
      }
      const fresh = collect();
      apply(fresh.units, fresh.attrs, fresh.metaDesc);
      reveal();
      persist();
      // new strings are being translated on the server — check back a few times
      if (pending && tries < 4) { tries++; clearTimeout(timer); timer = setTimeout(run, [3000, 6000, 12000, 25000][tries - 1]); }
    }

    void run();
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const obs = new MutationObserver(() => {
      if (writing) return;
      clearTimeout(debounce);
      debounce = setTimeout(() => { tries = 0; void run(); }, 300);
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => { obs.disconnect(); clearTimeout(timer); clearTimeout(debounce); clearTimeout(failSafe); };
  }, [lang]);
  return null;
}
