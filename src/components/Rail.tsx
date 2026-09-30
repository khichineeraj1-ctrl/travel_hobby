'use client';
import { useRef } from 'react';

/** Horizontal scroller with Apple-style round arrow buttons. */
export function Rail({ children, label }: { children: React.ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const go = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <div className="group/rail relative">
      <div
        ref={ref}
        aria-label={label}
        className="rail-pad no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth py-6"
      >
        {children}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden items-center justify-between px-3 opacity-0 transition-opacity duration-300 group-hover/rail:opacity-100 md:flex">
        {[-1, 1].map((dir) => (
          <button
            key={dir}
            type="button"
            onClick={() => go(dir as 1 | -1)}
            aria-label={dir < 0 ? 'Scroll left' : 'Scroll right'}
            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(210,210,215,0.64)] text-ink/80 backdrop-blur transition hover:bg-[rgba(223,223,227,0.9)]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              {dir < 0 ? <path d="m15 5-7 7 7 7" /> : <path d="m9 5 7 7-7 7" />}
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
