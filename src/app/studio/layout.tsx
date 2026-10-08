import Link from 'next/link';
import type { Metadata } from 'next';
import { Wordmark } from '@/components/Wordmark';
import { currentAccount } from '@/lib/contrib';
import { signOut } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Writer studio', robots: { index: false, follow: false } };

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const acc = await currentAccount();
  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-30 border-b border-line bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
          <Link href="/studio" className="text-lg"><Wordmark /> <span className="text-sm font-normal text-faint">studio</span></Link>
          {acc && (
            <nav className="ml-auto flex items-center gap-4 text-sm">
              <Link href="/studio" className="hover:underline">My notes</Link>
              <Link href="/studio/profile" className="hover:underline">My profile</Link>
              <Link href="/" target="_blank" className="text-mute hover:underline">Live site ↗</Link>
              <form action={signOut}><button className="text-mute hover:text-ink">Sign out</button></form>
            </nav>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:py-10">{children}</main>
    </div>
  );
}
