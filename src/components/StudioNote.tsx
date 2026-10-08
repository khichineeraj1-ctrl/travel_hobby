import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { GemCard } from '@/components/GemCard';
import { GuideEnd } from '@/components/GuideEnd';
import { LeadForm } from '@/components/LeadForm';
import { AuthorAvatar } from '@/components/AuthorAvatar';
import { JsonLd } from '@/lib/jsonld';
import { abs } from '@/lib/seo';
import { authorHref, authorLd, authorOrDefault } from '@/lib/authors';
import { guide, guideQuiet } from '@/lib/guide';
import { asCard, gemIndex } from '@/lib/gemPages';
import { stateNameOf } from '@/lib/notes';
import type { NoteDoc, NotePhotoDoc } from '@/lib/types';

const fmtDate = (x: string) => new Date(x).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const paras = (s: string) => s.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

/** **bold** is the only formatting writers get — keeps pages clean and safe. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return <>{parts.map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>))}</>;
}

function Photo({ p }: { p: NotePhotoDoc }) {
  return (
    <figure>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.src} alt={p.alt} loading="lazy" className={`w-full rounded-apple object-cover shadow-tile ${p.wide ? 'aspect-[4/3]' : 'aspect-[3/4]'}`} />
      {p.caption && <figcaption className="mt-2 text-sm text-mute">{p.caption}</figcaption>}
    </figure>
  );
}

/** Generic field-note page for notes written in the contributor studio. */
export function StudioNote({ d, preview }: { d: NoteDoc; preview?: React.ReactNode }) {
  const author = authorOrDefault(d.authorSlug);
  const stateName = stateNameOf(d.stateSlug);
  const url = `/notes/${d.slug}`;
  const checked = d.checked ?? d.publishedAt ?? d.updatedAt;
  const near = gemIndex().list.filter((g) => g.stateSlug === d.stateSlug)
    .sort((a, b) => (b.rating ?? 0) * Math.log10((b.reviews ?? 1) + 1) - (a.rating ?? 0) * Math.log10((a.reviews ?? 1) + 1))
    .slice(0, 4);

  return (
    <article>
      {!preview && (
        <JsonLd data={[
          {
            '@context': 'https://schema.org', '@type': 'Article', headline: d.title, description: d.description,
            image: d.cover ? [abs(d.cover.src)] : undefined, url: abs(url), mainEntityOfPage: abs(url),
            datePublished: (d.publishedAt ?? d.updatedAt).slice(0, 10), dateModified: checked.slice(0, 10),
            author: authorLd(author), publisher: { '@type': 'Organization', name: 'Beyond Explored', url: abs('/') },
            about: { '@type': 'TouristDestination', name: d.place, containedInPlace: { '@type': 'AdministrativeArea', name: stateName } },
          },
          ...(d.faq.length ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: d.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }] : []),
        ]} />
      )}
      {preview}
      <GuideEnd text={`Planning ${d.place}? Tell us your dates — we’ll help you plan it.`} label={`Plan ${d.place}`} href="#enquire" />

      <div className="wrap pt-6">
        <Breadcrumbs items={[{ name: 'Field notes', path: '/notes' }, { name: d.place, path: url }]} />
      </div>

      <header className="wrap mt-8 grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div className="min-w-0">
          <p className="kicker">Field notes · {stateName} · visited {d.visited}</p>
          <h1 className="mt-2 text-balance text-[32px] font-semibold leading-[1.08] tracking-tightest sm:text-[44px]">{d.title}</h1>
          <div className="mt-4 flex items-center gap-3 text-sm text-mute">
            <Link href={authorHref(author)} className="shrink-0" aria-label={`About ${author.name}`}><AuthorAvatar a={author} /></Link>
            <span>By <Link href={authorHref(author)} rel="author" className="font-semibold text-ink hover:underline">{author.name}</Link> · visited {d.visited} · facts checked <time dateTime={checked.slice(0, 10)}>{fmtDate(checked)}</time></span>
          </div>
          <div className="mt-4 space-y-3 text-lg leading-relaxed text-mute">{paras(d.intro).map((p) => <p key={p.slice(0, 40)}><Rich text={p} /></p>)}</div>
        </div>
        {d.cover && (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.cover.src} alt={d.cover.alt} className="aspect-[16/10] w-full rounded-apple object-cover shadow-tile" />
          </figure>
        )}
      </header>

      {d.quick.length > 0 && (
        <section className="wrap mt-12" aria-labelledby="quick">
          <div className="card p-6 sm:p-8">
            <h2 id="quick" className="text-xl font-semibold tracking-headline">Quick answers</h2>
            <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {d.quick.map((x) => (
                <div key={x.q} className="min-w-0">
                  <dt className="text-[15px] text-mute">{x.q}</dt>
                  <dd className="mt-0.5 text-[17px] font-semibold leading-snug">{x.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      <div className="wrap mt-16 grid gap-12 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-16">
          {d.sections.map((s, i) => (
            <section key={i}>
              {s.kicker && <p className="kicker">{s.kicker}</p>}
              <h2 className="mt-1 text-[28px] font-semibold tracking-headline sm:text-[32px]">{s.heading}</h2>
              <div className="mt-4 space-y-4 text-[17px] leading-relaxed">{paras(s.body).map((p) => <p key={p.slice(0, 40)}><Rich text={p} /></p>)}</div>
              {s.photos.length > 0 && (
                <div className={`mt-6 grid gap-4 ${s.photos.length === 1 ? '' : s.photos.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
                  {s.photos.map((p) => <Photo key={p.src} p={p} />)}
                </div>
              )}
            </section>
          ))}

          {near.length > 0 && (
            <section {...guide(`More of ${stateName} worth a detour.`, { label: 'Add to my trip', href: '#enquire' })}>
              <h2 className="text-[28px] font-semibold tracking-headline sm:text-[32px]">Ideas for a spare day in {stateName}</h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">{near.map((g) => <GemCard key={g.id} g={asCard(g)} />)}</div>
            </section>
          )}

          {(d.faq.length > 0 || d.sources.length > 0) && (
            <section id="faq" className="scroll-mt-16">
              {d.faq.length > 0 && (
                <>
                  <h2 className="text-[28px] font-semibold tracking-headline sm:text-[32px]">{d.place} FAQ</h2>
                  <div className="card mt-5 divide-y divide-line/70">
                    {d.faq.map((f) => (
                      <details key={f.q} className="group px-6 py-5">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold">
                          {f.q}<span className="text-2xl font-light text-mute transition group-open:rotate-45" aria-hidden>+</span>
                        </summary>
                        <p className="mt-2 text-[15px] leading-relaxed text-mute">{f.a}</p>
                      </details>
                    ))}
                  </div>
                </>
              )}
              <p className="mt-4 text-sm text-faint">
                How we wrote this: from {author.name}’s own trip in {d.visited}
                {d.sources.length > 0 && <>, with facts checked against {d.sources.map((x, i) => <span key={x.href}>{i ? ' and ' : ''}<a href={x.href} target="_blank" rel="noreferrer nofollow" className="underline">{x.label}</a></span>)}</>}
                {' '}on {fmtDate(checked)}. Things change — confirm before you book.
              </p>
            </section>
          )}

          <section id="enquire" className="scroll-mt-16" {...guideQuiet}>
            <h2 className="text-[28px] font-semibold tracking-headline sm:text-[32px]">Plan {d.place} with us</h2>
            <p className="mt-1 text-[17px] text-mute">Tell us your dates and who’s coming — free itinerary on WhatsApp.</p>
            <div className="mt-5"><LeadForm kind="enquiry" source={url} places={[{ slug: d.slug || 'note', name: d.place }]} defaultPlace={d.place} /></div>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-16 lg:self-start">
          {d.quick.length > 0 && (
            <div className="card p-6">
              <p className="text-lg font-semibold">In short</p>
              <ul className="mt-3 space-y-2 text-[15px] text-mute">{d.quick.slice(0, 4).map((x) => <li key={x.q}>• {x.a}</li>)}</ul>
              <a href="#enquire" className="btn mt-5 w-full justify-center">Plan my {d.place} trip</a>
            </div>
          )}
          <Link href={authorHref(author)} className="card card-hover flex items-center gap-3 p-5">
            <AuthorAvatar a={author} size={48} />
            <span className="min-w-0"><span className="block text-xs text-mute">Written by</span><span className="block font-semibold">{author.name}</span><span className="block text-sm text-mute">{author.role}</span></span>
          </Link>
        </aside>
      </div>
    </article>
  );
}
