'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/** Phone/tablet navigation: the desktop link row is hidden below lg, so this is how mobile users get around. */
export function MobileMenu({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [open]);
  return (
    <div className="lg:hidden">
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? 'Close menu' : 'Open menu'} className="-mr-2 flex h-10 w-10 items-center justify-center hover:text-ink">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {open && (
        <div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-x-0 bottom-0 top-11 z-50 overflow-y-auto bg-[rgba(245,245,247,0.98)] px-6 pb-10 pt-4 backdrop-blur-xl">
          <ul>
            {items.map((n) => (
              <li key={n.href} className="border-b border-line/70">
                <Link href={n.href} className={`block py-3.5 text-[22px] font-semibold tracking-headline ${path === n.href ? 'text-blue-link' : 'text-ink'}`}>{n.label}</Link>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/roll" prefetch={false} className="chip">🎲 Surprise me</Link>
            <Link href="/book/custom" className="chip">Custom trip</Link>
            <Link href="/partners" className="chip">List your property</Link>
          </div>
        </div>
      )}
    </div>
  );
}
