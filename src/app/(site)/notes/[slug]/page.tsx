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
      <GuideEnd text="Made it to the end? You’re ready. Tell us your dates and we’ll check which zones are open for you." label="Plan Corbett" href="#enquire" />

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
            <p className="kicker">Eight jungles, three opening days</p>
            <h2 className="mt-1 text-[28px] font-semibold tracking-headline sm:text-[32px]">Which Corbett zones are open — and when?</h2>
            <div className="mt-4 space-y-4 text-[17px] leading-relaxed">
              <p>Here’s the thing the brochures skip. Corbett Tiger Reserve is carved into eight safari zones, and they wake up on a staggered calendar. Three of them run all year. One — Bijrani, the crowd favourite — swings open on <b>15 October</b>. The remaining four, including Dhikala, the deep-forest heart of the park, wait until <b>15 November</b>.</p>
              <p>So the month you pick quietly decides which Corbett you get. Go in early October and you’re choosing between the all-season zones and, from mid-month, Bijrani. Go after mid-November and the whole reserve is yours to play with. Plan around this one detail and half your trip is already sorted.</p>
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
              <Photo p={P('amdanda-gate-bijrani', 'Amdanda gate, the entry to the Bijrani zone in Corbett', 'Amdanda gate, the doorway to Bijrani — it opens on 15 October.')} />
              <Photo p={P('gate-signboard', 'Corbett Tiger Reserve signboard pointing to Dhangarhi gate and Durga Devi gate', 'The fork in the road: Dhangarhi gate for Dhikala, Durga Devi gate for its namesake zone. Both open from 15 November.')} />
            </div>
          </section>

          {/* tigers */}
          <section {...guide('Inside-the-jungle rooms go first. A month ahead is the minimum, not the ideal.', { label: 'Help me book', href: '#enquire' })}>
            <p className="kicker">If you want the stripes, sleep inside the forest</p>
            <h2 className="mt-1 text-[28px] font-semibold tracking-headline sm:text-[32px]">Where should I stay in Corbett to see a tiger?</h2>
            <div className="mt-4 space-y-4 text-[17px] leading-relaxed">
              <p>Let’s be honest about the classic Corbett day trip. You queue at a gate before sunrise, bounce around for three hours in a gypsy alongside a convoy of other gypsies, and head back to your resort for breakfast. It’s a good morning. It is rarely a tiger morning.</p>
              <p>The travellers who come home with the photo almost always did one thing differently: they <b>stayed inside the reserve</b>, in one of the forest rest houses deep in the zones. When you wake up in the jungle, you’re already there at first light — and last light — when the forest actually moves. No commute, no gate queue, no convoy.</p>
              <p>The catch is that everyone knows this. Those rooms are few, and the good dates vanish the day booking opens. <b>Book on the official Corbett Tiger Reserve website at least a month ahead</b> — more if you’re eyeing a long weekend or the Diwali–Christmas stretch. Day-safari permits disappear on weekends too.</p>
            </div>
            <p className="mt-6 text-[15px] font-semibold">A few things we’d tell you over chai:</p>
            <ul className="mt-5 space-y-2.5 text-[15px]">
              {[
                'Only book on the official site. Lookalike websites and roadside agents add fat markups — and a permit bought through the wrong channel can simply be cancelled.',
                'Carry the exact ID you booked with. The gate staff check, and “it’s on my other phone” won’t get you in.',
                'Pick the dawn slot every time. The air is cool, the light is golden, and the animals haven’t gone into hiding from the heat yet.',
                'First time? Bijrani is the friendliest introduction. Coming back for more? Dhikala is the one to sleep in — it’s the wildest corner of the park.',
              ].map((t) => <li key={t} className="flex gap-2"><span className="text-blue">●</span>{t}</li>)}
            </ul>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href={CORBETT_OFFICIAL} target="_blank" rel="noreferrer" className="btn-secondary">Official booking site</a>
              <a href="#enquire" className="link-arrow self-center">Or let us book it for you</a>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <Photo p={P('safari-gypsy', 'Open safari gypsy parked by the forest at Corbett', 'The open gypsies line up before sunrise. Grab a jacket — October mornings bite.')} />
              <Photo p={P('forest-road-morning', 'Early-morning sunlight on the forest road through Corbett', 'Seven in the morning on the forest road. This light is the whole reason you set the alarm.')} />
            </div>
          </section>

          {/* eat */}
          <section id="eat" className="scroll-mt-20" {...guide('Busy on weekends — book a table or go early.', { label: 'Plan the trip', href: '#enquire' })}>
            <p className="kicker">Village Vatika — the dinner we’d drive back for</p>
            <h2 className="mt-1 text-[28px] font-semibold tracking-headline sm:text-[32px]">Where should I eat in Ramnagar?</h2>
            <div className="mt-4 space-y-4 text-[17px] leading-relaxed">
              <p>After a day of dust and early alarms, you want a long, slow dinner — not a resort buffet. Village Vatika sits right on the main road through Ramnagar (NH309, at Ladwachaur), so there’s no hunting for it down a dark lane. Walk in through the creeper-covered arch and the noise of the highway just drops away.</p>
              <p>The food was <b>properly excellent</b> — the kind of meal where the table goes quiet for the first ten minutes. And here’s the bit that makes it a Corbett institution: you can <b>bring your own whisky</b> (or whatever you’re drinking), settle in among the plants under the warm lights, and let the plates keep coming.</p>
              <p>Don’t mistake BYOB for rowdy, though. When we were there it was almost entirely families — whole tables of parents, kids and grandparents, everyone settled in for a long evening. It’s the rare place that works for a couples’ night out and a three-generation dinner at the same time.</p>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {[
                ['Main road', 'NH309, Ladwachaur, Ramnagar'],
                ['Bring your own', 'Whisky, beer or wine — they serve the food'],
                ['Family crowd', 'Mostly families in the evening — relaxed, not rowdy'],
              ].map(([h, t]) => <div key={h} className="card p-5"><p className="font-semibold">{h}</p><p className="mt-1 text-[15px] text-mute">{t}</p></div>)}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <Photo p={P('village-vatika-entrance', 'Entrance arch of Village Vatika restaurant covered in creepers', 'Through the arch and the highway disappears.')} />
              <Photo p={P('village-vatika-night', 'Night seating at Village Vatika among potted plants and warm lights', 'After dark, among the plants and the lamps. Ask for a table out here.')} />
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
              <p>Ramnagar is your base — almost every gate is a short drive from town, and it’s where the hotels, the gypsies and the dinner tables are. From Delhi it’s one long, straightforward road east via Moradabad; leave before the city wakes up and you’ll miss the worst of the traffic.</p>
              <p>You’ll know you’ve arrived when the Kosi river opens up beside you at the Ramnagar barrage. A few minutes later the plains give way to tall, straight sal trees, the air cools a couple of degrees, and the phone signal starts to flicker. That’s Corbett saying hello.</p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Photo p={P('highway-to-ramnagar', 'Highway sign towards Moradabad and Bareilly on the drive to Ramnagar', 'Early on the highway. Moradabad first, then the hills.')} />
              <Photo p={P('kosi-barrage', 'Kosi river barrage at Ramnagar', 'The Kosi at Ramnagar — the unofficial welcome sign.')} />
              <Photo p={P('sal-forest', 'Sal forest at Jim Corbett', 'Sal forest closing in. You’re here.')} className="col-span-2 sm:col-span-1" />
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
            <p className="text-lg font-semibold">If you read nothing else</p>
            <ul className="mt-3 space-y-2 text-[15px] text-mute">
              <li>🗓️ 3 zones all year · Bijrani from 15 Oct · 4 more from 15 Nov</li>
              <li>🐅 Serious about tigers? Sleep inside the forest</li>
              <li>📅 Book a month or more ahead — official site only</li>
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
