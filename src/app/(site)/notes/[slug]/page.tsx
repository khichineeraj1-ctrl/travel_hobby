import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { GemCard } from '@/components/GemCard';
import { GuideEnd } from '@/components/GuideEnd';
import { LeadForm } from '@/components/LeadForm';
import { JsonLd } from '@/lib/jsonld';
import { abs, meta } from '@/lib/seo';
import { authorHref, authorLd, authorOrDefault } from '@/lib/authors';
import { AuthorAvatar } from '@/components/AuthorAvatar';
import { guide, guideQuiet } from '@/lib/guide';
import { asCard, gemIndex } from '@/lib/gemPages';
import { km } from '@/lib/places';
import { CORBETT_OFFICIAL, CORBETT_ZONES, noteBySlug, type NotePhoto, type Zone } from '@/data/notes';
import { studioNoteBySlug } from '@/lib/notes';
import { StudioNote } from '@/components/StudioNote';

type P = { params: Promise<{ slug: string }> };

const fmtDate = (x: string) => new Date(x).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const slug = (await params).slug;
  const n = noteBySlug(slug);
  if (!n) {
    const d = studioNoteBySlug(slug);
    if (!d) return {};
    return meta({ title: d.title, description: d.description, path: `/notes/${d.slug}`, image: d.cover?.src, imageSize: d.cover ? { width: 1600, height: 900 } : undefined, article: { published: (d.publishedAt ?? d.updatedAt).slice(0, 10), modified: (d.checked ?? d.updatedAt).slice(0, 10), author: authorOrDefault(d.authorSlug).name } });
  }
  return meta({ title: n.seoTitle, description: n.description, path: `/notes/${n.slug}`, image: n.cover.src, imageSize: { width: n.cover.width, height: n.cover.height }, article: { published: n.published, modified: n.checked, author: authorOrDefault(n.authorSlug).name } });
}

function Photo({ p, className = '' }: { p: NotePhoto; className?: string }) {
  return (
    <figure className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.src} alt={p.alt} loading="lazy" className={`w-full rounded-apple object-cover shadow-tile ${p.wide ? 'aspect-[4/3]' : 'aspect-[3/4]'}`} />
      {p.caption && <figcaption className="mt-2 text-sm text-mute">{p.caption}</figcaption>}
    </figure>
  );
}

const OPENS: Record<Zone['opens'], { label: string; cls: string }> = {
  'all-year': { label: 'Open all year', cls: 'bg-[#e3f9e5] text-[#1a7f37]' },
  'oct-15': { label: 'Opens 15 Oct', cls: 'bg-[#fff4e5] text-[#9a4b00]' },
  'nov-15': { label: 'Opens 15 Nov', cls: 'bg-blue-soft text-blue-link' },
};

export default async function NotePage({ params }: P) {
  const slug = (await params).slug;
  const n = noteBySlug(slug);
  if (!n) {
    const d = studioNoteBySlug(slug);
    if (!d) notFound();
    return <StudioNote d={d} />;
  }
  const author = authorOrDefault(n.authorSlug);

  const near = gemIndex().list
    .map((g) => ({ g, d: Math.round(km(n, g)) }))
    .filter((x) => x.d <= 60)
    .sort((a, b) => (b.g.rating ?? 0) * Math.log10((b.g.reviews ?? 1) + 1) - (a.g.rating ?? 0) * Math.log10((a.g.reviews ?? 1) + 1))
    .slice(0, 6);
  const count = (o: Zone['opens']) => CORBETT_ZONES.filter((z) => z.opens === o).length;

  const P = (src: string, alt: string, caption?: string, wide = false): NotePhoto => ({ src: `/notes/corbett/${src}.jpg`, alt, caption, wide });

  return (
    <article>
      <JsonLd data={[
        {
          '@context': 'https://schema.org', '@type': 'Article', headline: n.title, description: n.description,
          image: [abs(n.cover.src), abs(n.hero.src)], url: abs(`/notes/${n.slug}`), mainEntityOfPage: abs(`/notes/${n.slug}`),
          datePublished: n.published, dateModified: n.checked,
          author: authorLd(author),
          publisher: { '@type': 'Organization', name: 'Beyond Explored', url: abs('/') },
          about: { '@type': 'TouristDestination', name: 'Jim Corbett National Park', geo: { '@type': 'GeoCoordinates', latitude: n.lat, longitude: n.lng } },
          mentions: { '@type': 'Restaurant', name: 'Village Vatika', address: { '@type': 'PostalAddress', streetAddress: 'NH309, Ladwachaur', addressLocality: 'Ramnagar', addressRegion: 'Uttarakhand', addressCountry: 'IN' } },
        },
        { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: n.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
      ]} />
      <GuideEnd text="Ready to plan? Tell us your dates and we’ll check which zones are open for you." label="Plan Corbett" href="#enquire" />

      <div className="wrap pt-6">
        <Breadcrumbs items={[{ name: 'Field notes', path: '/notes' }, { name: n.place, path: `/notes/${n.slug}` }]} />
      </div>

      <header className="wrap mt-8 grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div className="min-w-0">
          <p className="kicker">Field notes · {n.stateName} · visited {n.visited}</p>
          <h1 className="mt-2 text-balance text-[32px] font-semibold leading-[1.08] tracking-tightest sm:text-[44px]">{n.title}</h1>
          <div className="mt-4 flex items-center gap-3 text-sm text-mute">
            <Link href={authorHref(author)} className="shrink-0" aria-label={`About ${author.name}`}>
              <AuthorAvatar a={author} />
            </Link>
            <span>By <Link href={authorHref(author)} rel="author" className="font-semibold text-ink hover:underline">{author.name}</Link> · visited {n.visited} · facts checked <time dateTime={n.checked}>{fmtDate(n.checked)}</time></span>
          </div>
          <p className="mt-4 text-lg leading-relaxed text-mute">{n.intro}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#zones" className="btn">See the 8 zones</a>
            <a href="#eat" className="btn-secondary">Where to eat</a>
          </div>
        </div>
        <Photo p={n.hero} />
      </header>

      {/* answer-first: the short answers people (and AI search) are looking for */}
      <section className="wrap mt-12" aria-labelledby="quick">
        <div className="card p-6 sm:p-8">
          <h2 id="quick" className="text-xl font-semibold tracking-headline">Quick answers</h2>
          <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {n.quick.map((x) => (
              <div key={x.q} className="min-w-0">
                <dt className="text-[15px] text-mute">{x.q}</dt>
                <dd className="mt-0.5 text-[17px] font-semibold leading-snug">{x.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="wrap mt-16 grid gap-12 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-16">
          {/* zones */}
          <section id="zones" className="scroll-mt-20" {...guide('Bookmark this — most people only find out a zone is shut when they reach the gate.', { label: 'Plan Corbett', href: '#enquire' })}>
            <p className="kicker">8 zones, 3 opening dates</p>
            <h2 className="mt-1 text-[28px] font-semibold tracking-headline sm:text-[32px]">Which Corbett zones are open — and when?</h2>
            <div className="mt-4 space-y-4 text-[17px] leading-relaxed">
              <p>Most people don’t know this before they go. Corbett Tiger Reserve has eight safari zones, and they don’t all open on the same day. Three zones are open all year. Bijrani, the most popular one, opens on <b>15 October</b>. The other four, including Dhikala in the deep forest, open on <b>15 November</b>.</p>
              <p>So your travel month decides which zones you can visit. In early October, you can only go to the three all-year zones, and to Bijrani after 15 October. After mid-November, every zone is open. Check this first and half your planning is done.</p>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="card p-4 text-center"><p className="text-3xl font-semibold">{count('all-year')}</p><p className="mt-1 text-sm text-mute">open all year</p></div>
              <div className="card p-4 text-center"><p className="text-3xl font-semibold">{count('oct-15')}</p><p className="mt-1 text-sm text-mute">open from 15 Oct</p></div>
              <div className="card p-4 text-center"><p className="text-3xl font-semibold">{count('nov-15')}</p><p className="mt-1 text-sm text-mute">open from 15 Nov</p></div>
            </div>

            <div className="card mt-4 divide-y divide-line/70">
              {CORBETT_ZONES.map((z) => (
                <div key={z.name} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-[17px] font-semibold">{z.name}</p>
                    <p className="text-sm text-mute">{z.gate}{z.note ? ` · ${z.note}` : ''}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${OPENS[z.opens].cls}`}>{OPENS[z.opens].label}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-faint">As we found it in October 2026. The core zones shut for the monsoon (roughly mid/late June) and dates can shift by a few days — confirm on the <a href={CORBETT_OFFICIAL} target="_blank" rel="noreferrer" className="underline">official Corbett site</a> before you go.</p>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <Photo p={P('amdanda-gate-bijrani', 'Amdanda gate, the entry to the Bijrani zone in Corbett', 'Amdanda gate — this is how you enter Bijrani. It opens on 15 October.')} />
              <Photo p={P('gate-signboard', 'Corbett Tiger Reserve signboard pointing to Dhangarhi gate and Durga Devi gate', 'Signboard to Dhangarhi gate (for Dhikala) and Durga Devi gate. Both open from 15 November.')} />
            </div>
          </section>

          {/* tigers */}
          <section {...guide('Inside-the-jungle rooms go first. A month ahead is the minimum, not the ideal.', { label: 'Help me book', href: '#enquire' })}>
            <p className="kicker">Want to see a tiger? Stay inside the forest</p>
            <h2 className="mt-1 text-[28px] font-semibold tracking-headline sm:text-[32px]">Where should I stay in Corbett to see a tiger?</h2>
            <div className="mt-4 space-y-4 text-[17px] leading-relaxed">
              <p>Most people do a day safari. You wait at the gate before sunrise, ride for about three hours in an open jeep (gypsy) along with many other jeeps, and go back to your hotel for breakfast. It’s a nice morning, but you usually don’t see a tiger.</p>
              <p>People who do see a tiger usually <b>stay inside the reserve</b>, at a forest rest house. You wake up inside the jungle, so you are already there early in the morning and in the evening — the time when animals come out. No driving to the gate, no waiting in line.</p>
              <p>The problem: there are very few of these rooms, and good dates get booked on the first day. <b>Book on the official Corbett Tiger Reserve website at least one month before</b> — even earlier for long weekends and the Diwali-to-Christmas season. Day safari permits also sell out on weekends.</p>
            </div>
            <p className="mt-6 text-[15px] font-semibold">A few simple tips:</p>
            <ul className="mt-5 space-y-2.5 text-[15px]">
              {[
                'Book only on the official website. Fake look-alike websites and agents charge much more, and a permit bought from them can be cancelled.',
                'Carry the same ID card you used for booking. They check it at the gate.',
                'Choose the early morning safari. It’s cooler, and animals are more active before the day gets hot.',
                'First time? Start with Bijrani. Want more? Stay a night in Dhikala — it’s the wildest part of the park.',
              ].map((t) => <li key={t} className="flex gap-2"><span className="text-blue">●</span>{t}</li>)}
            </ul>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href={CORBETT_OFFICIAL} target="_blank" rel="noreferrer" className="btn-secondary">Official booking site</a>
              <a href="#enquire" className="link-arrow self-center">Or let us book it for you</a>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <Photo p={P('safari-gypsy', 'Open safari gypsy parked by the forest at Corbett', 'Safari jeeps wait near the gate before sunrise. Carry a jacket — October mornings are cold.')} />
              <Photo p={P('forest-road-morning', 'Early-morning sunlight on the forest road through Corbett', 'The forest road at 7 am. Early mornings are the best time to be here.')} />
            </div>
          </section>

          {/* eat */}
          <section id="eat" className="scroll-mt-20" {...guide('Busy on weekends — book a table or go early.', { label: 'Plan the trip', href: '#enquire' })}>
            <p className="kicker">Village Vatika — we’d go back just for dinner</p>
            <h2 className="mt-1 text-[28px] font-semibold tracking-headline sm:text-[32px]">Where should I eat in Ramnagar?</h2>
            <div className="mt-4 space-y-4 text-[17px] leading-relaxed">
              <p>After a long safari day, you want a relaxed dinner, not a hotel buffet. Village Vatika is right on the main road in Ramnagar (NH309, Ladwachaur), so it’s easy to find. Once you walk in through the green arch, it’s calm and quiet inside.</p>
              <p>The food was <b>really good</b>. And the best part: you can <b>bring your own whisky</b> or drinks, sit among the plants under soft lights, and order food as you go.</p>
              <p>But it’s not a noisy party place. When we were there, it was mostly families — parents, kids and grandparents enjoying a long dinner. It works well for couples and for the whole family.</p>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {[
                ['Main road', 'NH309, Ladwachaur, Ramnagar'],
                ['Bring your own', 'Whisky, beer or wine — they serve the food'],
                ['Family crowd', 'Mostly families in the evening — relaxed, not rowdy'],
              ].map(([h, t]) => <div key={h} className="card p-5"><p className="font-semibold">{h}</p><p className="mt-1 text-[15px] text-mute">{t}</p></div>)}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <Photo p={P('village-vatika-entrance', 'Entrance arch of Village Vatika restaurant covered in creepers', 'The entrance, right on the main road.')} />
              <Photo p={P('village-vatika-night', 'Night seating at Village Vatika among potted plants and warm lights', 'Seating at night, among the plants. Ask for a table here.')} />
            </div>
            <p className="mt-4 text-sm text-faint">Their listing says they’re open daily, roughly 10am to 10:30pm. Weekends fill up — go early or call ahead. And if you’re bringing a bottle, sort a driver first.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href="https://www.google.com/maps/search/?api=1&query=Village+Vatika+Restaurant+Ramnagar" target="_blank" rel="noreferrer" className="btn-secondary">Directions</a>
            </div>
          </section>

          {/* getting there */}
          <section>
            <p className="kicker">The road in</p>
            <h2 className="mt-1 text-[28px] font-semibold tracking-headline sm:text-[32px]">How do I get to Jim Corbett from Delhi?</h2>
            <div className="mt-4 space-y-4 text-[17px] leading-relaxed">
              <p>Stay in Ramnagar. Most safari gates are a short drive from here, and it has the hotels, safari jeeps and restaurants. From Delhi, it’s one straight road via Moradabad. Leave early in the morning to avoid traffic.</p>
              <p>When you see the Kosi river at the Ramnagar barrage, you’re almost there. Soon you’ll see tall sal trees, the air gets a little cooler, and the phone signal gets weak. Welcome to Corbett.</p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Photo p={P('highway-to-ramnagar', 'Highway sign towards Moradabad and Bareilly on the drive to Ramnagar', 'On the highway towards Moradabad.')} />
              <Photo p={P('kosi-barrage', 'Kosi river barrage at Ramnagar', 'The Kosi river at Ramnagar.')} />
              <Photo p={P('sal-forest', 'Sal forest at Jim Corbett', 'Sal forest — you’ve reached Corbett.')} className="col-span-2 sm:col-span-1" />
            </div>
          </section>

          {near.length > 0 && (
            <section {...guide('Extra day? These are within an hour or two of Ramnagar.', { label: 'Add to my trip', href: '#enquire' })}>
              <h2 className="text-[28px] font-semibold tracking-headline sm:text-[32px]">Ideas for a spare day near Corbett</h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {near.map(({ g, d }) => <GemCard key={g.id} g={asCard(g, `${d} km from Corbett`)} />)}
              </div>
            </section>
          )}

          <section id="faq" className="scroll-mt-16">
            <h2 className="text-[28px] font-semibold tracking-headline sm:text-[32px]">Corbett FAQ</h2>
            <div className="card mt-5 divide-y divide-line/70">
              {n.faq.map((f) => (
                <details key={f.q} className="group px-6 py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold">
                    {f.q}
                    <span className="text-2xl font-light text-mute transition group-open:rotate-45" aria-hidden>+</span>
                  </summary>
                  <p className="mt-2 text-[15px] leading-relaxed text-mute">{f.a}</p>
                </details>
              ))}
            </div>
            <p className="mt-4 text-sm text-faint">
              How we wrote this: from our own trip in {n.visited}, with zone dates checked against{' '}
              {n.sources.map((x, i) => <span key={x.href}>{i ? ' and ' : ''}<a href={x.href} target="_blank" rel="noreferrer" className="underline">{x.label}</a></span>)}
              {' '}on {fmtDate(n.checked)}. Dates can shift — confirm before you book.
            </p>
          </section>

          <section id="enquire" className="scroll-mt-16" {...guideQuiet}>
            <h2 className="text-[28px] font-semibold tracking-headline sm:text-[32px]">Plan Corbett with us</h2>
            <p className="mt-1 text-[17px] text-mute">Tell us your dates and who’s coming. We’ll tell you exactly which zones are open, help you chase a forest rest house, and line up the safaris — free, on WhatsApp.</p>
            <div className="mt-5"><LeadForm kind="enquiry" source={`/notes/${n.slug}`} places={[{ slug: 'jim-corbett', name: 'Jim Corbett' }]} defaultPlace="Jim Corbett" /></div>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-16 lg:self-start">
          <div className="card p-6">
            <p className="text-lg font-semibold">In short</p>
            <ul className="mt-3 space-y-2 text-[15px] text-mute">
              <li>🗓️ 3 zones all year · Bijrani from 15 Oct · 4 more from 15 Nov</li>
              <li>🐅 Want to see a tiger? Stay inside the forest</li>
              <li>📅 Book 1 month before — official website only</li>
              <li>🍽️ Dinner at Village Vatika — bring your own bottle</li>
            </ul>
            <a href="#enquire" className="btn mt-5 w-full justify-center">Plan my Corbett trip</a>
            <Link href="/hidden-gems/uttarakhand" className="mt-3 block text-center text-[15px] text-blue-link hover:underline">More in Uttarakhand</Link>
          </div>
        </aside>
      </div>
    </article>
  );
}
