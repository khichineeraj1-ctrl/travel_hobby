import Link from 'next/link';
import { getByMonth, getSettings } from '@/lib/repo';
import { currentMonth, monthLabel, monthName } from '@/lib/months';
import { LeadForm } from './LeadForm';
import { Wordmark } from './Wordmark';
import { SITE_NAME } from '@/lib/seo';
import { assistantEnabled } from '@/lib/assistant';
import { MicButton } from './AskBeyond';
import { MobileMenu } from './MobileMenu';

const NAV = [
  { href: '/explore', label: 'Explore' },
  { href: '/hidden-gems', label: 'Hidden gems' },
  { href: '/spots', label: 'Top spots' },
  { href: '/events', label: 'Events' },
  { href: '/road-trips', label: 'Road trips' },
  { href: '/trips', label: 'Group trips' },
  { href: '/vibe', label: 'Vibes' },
  { href: '/from', label: 'From your city' },
  { href: '/plan-my-trip', label: 'Plan my trip' },
];

export function GlobalNav() {
  return (
    <header className="sticky top-0 z-40 bg-[rgba(245,245,247,0.8)] backdrop-blur-xl backdrop-saturate-150">
      <nav aria-label="Primary" className="mx-auto flex h-11 max-w-[1024px] items-center justify-between px-5 text-xs text-ink/80">
        <Link href="/" className="shrink-0 text-[17px]" aria-label={`${SITE_NAME} home`}>
          <Wordmark />
        </Link>
        <ul className="hidden items-center gap-7 lg:flex">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link href={n.href} className="transition-colors hover:text-ink">{n.label}</Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-5">
          {assistantEnabled() && <MicButton className="flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-[12px] font-medium text-white hover:bg-ink/85" label="Ask" />}
          <Link href="/explore" aria-label="Search places" className="hover:text-ink">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </Link>
          <Link href="/roll" prefetch={false} aria-label="Surprise me" className="hover:text-ink">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" /><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /></svg>
          </Link>
          <MobileMenu items={NAV} />
        </div>
      </nav>
    </header>
  );
}

export function Banner() {
  const { banner } = getSettings();
  if (!banner.enabled || !banner.text) return null;
  const m = currentMonth();
  const fill = (s: string) =>
    s.replaceAll('{month}', monthLabel(m)).replaceAll('{monthSlug}', monthName(m)).replaceAll('{peakCount}', String(getByMonth(m).length));
  return (
    <aside aria-label="Announcement" className="bg-white">
      <p className="wrap-narrow py-4 text-center text-sm text-ink">
        {fill(banner.text)}{' '}
        {banner.linkLabel && (
          <Link href={fill(banner.linkHref || '/')} className="text-blue-link hover:underline">
            {fill(banner.linkLabel)} <span aria-hidden className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-current text-[11px] leading-none">+</span>
          </Link>
        )}
      </p>
    </aside>
  );
}

export function Footer() {
  const { footerNote } = getSettings();
  const cols = [
    { h: 'Explore', l: [['Explore all', '/explore'], ['Full guides', '/places'], ['Hidden gems', '/hidden-gems'], ['Top spots', '/spots'], ['Field notes', '/notes'], ['Our authors', '/authors'], ['Write for us', '/contribute'], ['Events', '/events'], ['Road trips', '/road-trips'], ['By vibe', '/vibe'], ['By month', '/when'], ['By state', '/state']] },
    { h: 'Start from', l: [['Delhi', '/from/delhi'], ['Mumbai', '/from/mumbai'], ['Bengaluru', '/from/bengaluru'], ['All cities', '/from']] },
    { h: 'Who’s going', l: [['Solo', '/for/solo'], ['Couple', '/for/duo'], ['Squad', '/for/squad'], ['Family', '/for/fam']] },
    { h: 'Book', l: [['Upcoming trips', '/trips'], ['Custom trip', '/book/custom'], ['Plan my trip', '/plan-my-trip'], ['Surprise me', '/roll'], ['List your property', '/partners']] },
  ];
  return (
    <footer className="mt-24 bg-paper text-xs text-mute">
      <div className="wrap-narrow border-t border-line py-5">
        <div id="newsletter" className="grid scroll-mt-24 gap-6 border-b border-line pb-8 pt-4 sm:grid-cols-[1fr_1.4fr] sm:items-center" data-guide="" data-guide-quiet="1">
          <div>
            <p className="text-xl font-semibold tracking-headline text-ink">Hidden spots, monthly.</p>
            <p className="mt-1 text-sm">New places and trip drops before anyone else.</p>
          </div>
          <LeadForm kind="newsletter" source="footer" />
        </div>
        <p className="border-b border-line py-4 leading-relaxed">{footerNote}</p>
        <div className="grid grid-cols-2 gap-6 py-6 sm:grid-cols-4">
          {cols.map((c) => (
            <div key={c.h}>
              <p className="mb-2 font-semibold text-ink">{c.h}</p>
              <ul className="space-y-0.5">
                {c.l.map(([t, h]) => (
                  <li key={h}><Link href={h} prefetch={false} className="inline-block py-1 hover:text-ink hover:underline">{t}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="border-t border-line pt-4">Copyright © {new Date().getFullYear()} <Wordmark className="!font-medium" />. Get lost, on purpose.</p>
      </div>
    </footer>
  );
}

/** floating action — the "just send me" dice, bottom-right */
export function FloatingRoll() {
  return (
    <Link
      href="/roll"
      prefetch={false}
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl shadow-tilehover ring-1 ring-black/5 transition hover:scale-105"
      aria-label="Surprise me with a destination"
      title="Surprise me"
    >
      🎲
    </Link>
  );
}
