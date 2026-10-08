import Link from 'next/link';
import { PageHead } from '@/components/Listing';
import { AuthorAvatar } from '@/components/AuthorAvatar';
import { authorHref, getAuthors } from '@/lib/authors';
import { meta } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const metadata = meta({ title: 'Our Authors', description: 'The people behind Beyond Explored’s field notes — who they are, where they’ve been, and how we check every fact before we publish.', path: '/authors' });

export default function Authors() {
  const all = getAuthors();
  return (
    <div className="wrap">
      <PageHead crumbs={[{ name: 'Authors', path: '/authors' }]} kicker="Who writes this" h1="Our authors." intro="Real trips, real people. Here’s who’s behind every field note." />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {all.map((a) => (
          <Link key={a.slug} href={authorHref(a)} className="card card-hover flex items-center gap-4 p-5">
            <AuthorAvatar a={a} size={64} />
            <span className="min-w-0">
              <span className="block text-lg font-semibold">{a.name}</span>
              <span className="block text-sm text-mute">{a.role}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
