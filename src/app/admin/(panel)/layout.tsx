import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { logout } from '../actions';
import { readDb } from '@/lib/db';
import { Wordmark } from '@/components/Wordmark';

const NAV = [
  { href: '/admin', label: 'Overview', icon: '◎' },
  { href: '/admin/bookings', label: 'Bookings', icon: '✓', badge: 'bookings' },
  { href: '/admin/leads', label: 'Leads', icon: '✉', badge: 'leads' },
  { href: '/admin/events', label: 'Events', icon: '✺', badge: 'events' },
  { href: '/admin/roadtrips', label: 'Road trips', icon: '⤳' },
  { href: '/admin/trips', label: 'Group trips', icon: '⚑' },
  { href: '/admin/stays', label: 'Stays', icon: '⌂' },
  { href: '/admin/destinations', label: 'Places', icon: '⛰' },
  { href: '/admin/spots', label: 'Nearby spots', icon: '★' },
  { href: '/admin/rates', label: 'Stay prices', icon: '₹' },
  { href: '/admin/vibes', label: 'Vibes', icon: '✦' },
  { href: '/admin/cities', label: 'Starting cities', icon: '◌' },
  { href: '/admin/authors', label: 'Authors', icon: '✍' },
  { href: '/admin/settings', label: 'Site content', icon: '✎' },
];

export default async function Panel({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const db = readDb();
  const badges: Record<string, number> = {
    bookings: db.bookings.filter((b) => b.status === 'pending').length,
    leads: db.leads.filter((l) => l.status === 'new').length,
    events: db.events.filter((e) => e.status === 'suggested').length,
  };
  return (
    <div className="lg:grid lg:min-h-screen lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-line bg-white/80 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-6 py-5 lg:block">
          <Link href="/admin" className="text-lg"><Wordmark /> <span className="text-sm font-normal text-faint">admin</span></Link>
        </div>
        <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-[15px] text-ink hover:bg-paper">
              <span className="w-5 text-center text-mute">{n.icon}</span>{n.label}
              {'badge' in n && n.badge && badges[n.badge] ? <span className="ml-auto rounded-full bg-eyebrow px-2 text-xs text-white">{badges[n.badge]}</span> : null}
            </Link>
          ))}
        </nav>
        <div className="hidden space-y-2 px-6 pt-8 text-sm lg:block">
          <Link href="/" target="_blank" className="link-out block text-blue-link hover:underline">View live site</Link>
          <form action={logout}><button className="text-mute hover:text-ink">Sign out</button></form>
        </div>
      </aside>
      <main className="px-5 py-8 sm:px-10 lg:py-12">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
