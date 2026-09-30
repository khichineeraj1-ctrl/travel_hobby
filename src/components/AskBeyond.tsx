'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

type Card = { kind: 'place' | 'event' | 'roadtrip' | 'plan'; title: string; sub: string; href: string };
type Turn = { role: 'user' | 'assistant'; content: string; cards?: Card[] };

const OPEN_EVENT = 'ask-beyond:open';
/** Open the assistant from anywhere (optionally with a question pre-asked). */
export const openAsk = (q?: string) => window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: q }));

const STARTERS = [
  'Somewhere cold and quiet in December',
  '3 days from Bengaluru, budget 2k a day',
  'What’s happening in November?',
  'Is Hanle okay for my parents?',
];
const ICON: Record<Card['kind'], string> = { place: '⛰️', event: '🎉', roadtrip: '🛣️', plan: '✨' };

// minimal Web Speech API typings (not in TS lib)
type SR = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null };
const getSR = (): (new () => SR) | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export function MicButton({ className = '', label }: { className?: string; label?: string }) {
  return (
    <button type="button" onClick={() => openAsk()} aria-label="Ask Beyond by voice" title="Ask by voice" className={className}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
      {label && <span>{label}</span>}
    </button>
  );
}

export function AskBeyond() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState('');
  const [interim, setInterim] = useState('');
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const [micErr, setMicErr] = useState('');
  const rec = useRef<SR | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const turnsRef = useRef<Turn[]>([]);
  turnsRef.current = turns;

  useEffect(() => { setMicOk(!!getSR()); try { setMuted(localStorage.getItem('be-ask-muted') === '1'); } catch { /* */ } }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [turns, thinking, interim]);

  const speak = useCallback((t: string) => {
    if (muted || typeof speechSynthesis === 'undefined') return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t.replace(/₹\s?/g, '').replace(/[*_#>`]/g, ''));
    const voices = speechSynthesis.getVoices();
    u.voice = voices.find((v) => v.lang === 'en-IN') ?? voices.find((v) => /en-(GB|US)/.test(v.lang) && /female|samantha|google/i.test(v.name)) ?? voices.find((v) => v.lang.startsWith('en')) ?? null;
    u.rate = 1.04;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    speechSynthesis.speak(u);
  }, [muted]);

  const send = useCallback(async (q: string) => {
    const question = q.trim();
    if (!question || thinking) return;
    setText(''); setInterim('');
    const next: Turn[] = [...turnsRef.current, { role: 'user', content: question }];
    setTurns(next);
    setThinking(true);
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })), source: location.pathname }),
      });
      const j = await res.json().catch(() => ({}));
      const reply: Turn = { role: 'assistant', content: j.text || 'Hmm, lost signal for a sec. Try again?', cards: j.cards ?? [] };
      setTurns((t) => [...t, reply]);
      speak(reply.content);
    } catch {
      setTurns((t) => [...t, { role: 'assistant', content: 'Couldn’t reach my brain — check your connection and try again.' }]);
    } finally {
      setThinking(false);
    }
  }, [thinking, speak]);

  const listen = useCallback(() => {
    const SRc = getSR();
    if (!SRc) return;
    if (listening) { rec.current?.stop(); return; }
    try { speechSynthesis?.cancel(); } catch { /* */ }
    setMicErr('');
    const r = new SRc();
    r.lang = 'en-IN'; r.interimResults = true; r.continuous = false;
    let finalText = '';
    r.onresult = (e) => {
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript; else live += res[0].transcript;
      }
      setInterim(finalText + live);
    };
    r.onerror = (e) => setMicErr(e.error === 'not-allowed' ? 'Mic is blocked — allow it in your browser, or just type.' : e.error === 'no-speech' ? 'Didn’t catch that. Tap the mic and try again.' : '');
    r.onend = () => { setListening(false); if (finalText.trim()) send(finalText); else setInterim(''); };
    rec.current = r;
    setListening(true);
    r.start();
  }, [listening, send]);

  useEffect(() => {
    const onOpen = (e: Event) => {
      setOpen(true);
      const q = (e as CustomEvent<string | undefined>).detail;
      if (q) setTimeout(() => send(q), 50);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [send]);

  useEffect(() => {
    if (!open) { rec.current?.abort(); try { speechSynthesis?.cancel(); } catch { /* */ } }
    document.documentElement.dataset.ask = open ? 'open' : '';
  }, [open]);

  if (path?.startsWith('/admin')) return null;

  const toggleMute = () => {
    const m = !muted; setMuted(m);
    try { localStorage.setItem('be-ask-muted', m ? '1' : '0'); } catch { /* */ }
    if (m) try { speechSynthesis.cancel(); } catch { /* */ }
  };
  const state = listening ? 'Listening…' : thinking ? 'Thinking…' : speaking ? 'Talking…' : 'Ask me anything about offbeat India';

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-black/30 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={() => setOpen(false)} />
      <section
        role="dialog" aria-label="Ask Beyond"
        className={`absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-[28px] bg-white shadow-2xl transition-transform duration-300 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:h-[640px] sm:w-[420px] sm:rounded-[28px] ${open ? 'translate-y-0' : 'translate-y-[110%]'}`}
      >
        <header className="flex items-center gap-3 border-b border-line/70 px-5 py-4">
          <span aria-hidden className={`brand-dot h-9 w-9 rounded-full ${listening || speaking ? 'animate-pulse' : ''}`} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-tight">Ask Beyond</p>
            <p className="truncate text-xs text-mute">{state}</p>
          </div>
          <button onClick={toggleMute} className="rounded-full px-2 py-1 text-sm text-mute hover:bg-paper" aria-label={muted ? 'Turn voice replies on' : 'Mute voice replies'} title={muted ? 'Voice off' : 'Voice on'}>{muted ? '🔇' : '🔊'}</button>
          <button onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-mute hover:bg-paper" aria-label="Close">×</button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {!turns.length && (
            <div className="pt-2">
              <p className="text-[22px] font-semibold leading-snug tracking-headline">Where do you want to disappear to?</p>
              <p className="mt-1 text-[15px] text-mute">Tap the mic and just say it — dates, budget, who’s coming, the vibe. I only suggest places we’ve actually checked.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {STARTERS.map((s) => <button key={s} onClick={() => send(s)} className="chip !py-1.5 !text-sm">{s}</button>)}
              </div>
            </div>
          )}
          {turns.map((t, i) => (
            <div key={i} className={t.role === 'user' ? 'flex justify-end' : ''}>
              <div className={t.role === 'user' ? 'max-w-[85%] rounded-2xl rounded-br-md bg-blue px-4 py-2.5 text-[15px] text-white' : 'max-w-[95%] text-[15px] leading-relaxed'}>
                {t.content}
                {t.role === 'assistant' && !!t.cards?.length && (
                  <div className="mt-3 space-y-2">
                    {t.cards.map((c) => (
                      <Link key={c.href} href={c.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-2xl border border-line p-3 transition hover:border-blue ${c.kind === 'plan' ? 'bg-paper' : 'bg-white'}`}>
                        <span className="text-xl" aria-hidden>{ICON[c.kind]}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{c.title}</span>
                          <span className="block truncate text-xs text-mute">{c.sub}</span>
                        </span>
                        <span className="text-blue-link">›</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {interim && <div className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-md bg-blue/60 px-4 py-2.5 text-[15px] text-white">{interim}</div></div>}
          {thinking && <div className="flex gap-1 py-2" aria-label="Thinking"><span className="h-2 w-2 animate-bounce rounded-full bg-faint" /><span className="h-2 w-2 animate-bounce rounded-full bg-faint [animation-delay:.15s]" /><span className="h-2 w-2 animate-bounce rounded-full bg-faint [animation-delay:.3s]" /></div>}
          <div ref={endRef} />
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="border-t border-line/70 p-3">
          {micErr && <p className="px-2 pb-2 text-xs text-eyebrow">{micErr}</p>}
          <div className="flex items-center gap-2">
            {micOk && (
              <button type="button" onClick={listen} aria-label={listening ? 'Stop listening' : 'Speak'}
                className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white transition ${listening ? 'bg-[#ff2d55]' : 'bg-blue hover:bg-blue/90'}`}>
                {listening && <span className="absolute inset-0 animate-ping rounded-full bg-[#ff2d55]/40" />}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
              </button>
            )}
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder={micOk ? 'Or type here…' : 'Ask anything — e.g. quiet beach in March'} className="field !rounded-full" maxLength={500} aria-label="Your question" />
            <button disabled={!text.trim() || thinking} className="btn btn-sm shrink-0 disabled:opacity-40">Send</button>
          </div>
          <p className="px-2 pt-2 text-[10px] text-faint">AI answers from our own data — double-check permits & roads. Voice is processed by your browser.</p>
        </form>
      </section>
    </div>
  );
}
