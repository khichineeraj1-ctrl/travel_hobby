import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { AuthorAvatar } from '@/components/AuthorAvatar';
import { NoteCard } from '@/components/NoteBanner';
import { JsonLd } from '@/lib/jsonld';
import { abs, meta } from '@/lib/seo';
import { authorBySlug, authorHref, authorLd } from '@/lib/authors';
import { notesByAuthor } from '@/lib/notes';

type P = { params: Promise<{ slug: string }> };

const linkLabel = (u: string) => {
  try {
    const h = new URL(u).hostname.replace(/^www\./, '');
    return h.includes('instagram') ? 'Instagram' : h.includes('linkedin') ? 'LinkedIn' : h.includes('youtube') ? 'YouTube' : h === 'x.com' || h.includes('twitter') ? 'X' : h.includes('facebook') ? 'Facebook' : h;
  } catch { return u; }
};

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const a = authorBySlug((await params).slug);
  if (!a) return {};
  return meta({ title: `${a.name} — ${a.role}`, description: a.bio.split('\n')[0], path: authorHref(a), image: a.photo });
}

export default async function AuthorPage({ params }: P) {
  const a = authorBySlug((await params).slug);
  if (!a) notFound();
  const notes = notesByAuthor(a.slug);
  const paras = a.bio.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const standards = (a.standards ?? '').split('\n').map((s) => s.trim()).filter(Boolean);

  return (
    <div className="wrap">
      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'ProfilePage', url: abs(authorHref(a)),
        mainEntity: { ...authorLd(a), description: paras[0] },
        hasPart: notes.map((n) => ({ '@type': 'Article', headline: n.title, url: abs(`/notes/${n.slug}`), datePublished: n.published })),
      }} />
      <div className="pt-6"><Breadcrumbs items={[{ name: 'Authors', path: '/authors' }, { name: a.name, path: authorHref(a) }]} /></div>

      <header className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center">
        <AuthorAvatar a={a} size={112} />
        <div className="min-w-0">
          <p className="kicker">{a.role}{a.since ? ` · writing since ${a.since}` : ''}</p>
          <h1 className="mt-1 text-[36px] font-semibold leading-tight tracking-tightest sm:text-[48px]">{a.name}</h1>
          {(a.links.length > 0 || a.email) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {a.links.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer me" className="chip !text-sm">{linkLabel(u)} ↗</a>)}
              {a.email && <a href={`mailto:${a.email}`} className="chip !text-sm">Email</a>}
            </div>
          )}
        </div>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-12">
          <section>
            <h2 className="text-2xl font-semibold tracking-headline">About</h2>
            <div className="mt-3 space-y-4 text-[17px] leading-relaxed">{paras.map((p) => <p key={p.slice(0, 30)}>{p}</p>)}</div>
          </section>

          {standards.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold tracking-headline">How we write</h2>
              <ul className="mt-4 space-y-3 text-[15px]">
                {standards.map((s) => {
                  const [h, ...rest] = s.split(':');
                  return <li key={s} className="flex gap-2"><span className="text-blue">●</span><span>{rest.length ? <><b>{h}:</b>{rest.join(':')}</> : s}</span></li>;
                })}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-2xl font-semibold tracking-headline">Field notes by {a.name}</h2>
            {notes.length ? (
              <div className="mt-5 grid gap-5 sm:grid-cols-2">{notes.map((n) => <NoteCard key={n.slug} slug={n.slug} />)}</div>
            ) : <p className="mt-3 text-mute">Nothing published yet.</p>}
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-16 lg:self-start">
          {a.expertise.length > 0 && (
            <div className="card p-6">
              <p className="font-semibold">Knows about</p>
              <div className="mt-3 flex flex-wrap gap-1.5">{a.expertise.map((x) => <span key={x} className="pill">{x}</span>)}</div>
            </div>
          )}
          {a.regions.length > 0 && (
            <div className="card p-6">
              <p className="font-semibold">Been there</p>
              <ul className="mt-3 space-y-1.5 text-[15px] text-mute">{a.regions.map((x) => <li key={x}>📍 {x}</li>)}</ul>
            </div>
          )}
          <div className="card p-6">
            <p className="font-semibold">Spotted something out of date?</p>
            <p className="mt-1 text-[15px] text-mute">Tell us and we’ll fix the page and update its “facts checked” date.</p>
            <Link href="/plan-my-trip" className="mt-3 inline-block text-[15px] text-blue-link hover:underline">Get in touch ›</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
