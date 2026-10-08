import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { GemCard } from '@/components/GemCard';
import { GuideEnd } from '@/components/GuideEnd';
import { LeadForm } from '@/components/LeadForm';
import { JsonLd } from '@/lib/jsonld';
import { abs, meta } from '@/lib/seo';
import { guide, guideQuiet } from '@/lib/guide';
import { asCard, gemIndex } from '@/lib/gemPages';
import { km } from '@/lib/places';
import { CORBETT_OFFICIAL, CORBETT_ZONES, NOTES, noteBySlug, type NotePhoto, type Zone } from '@/data/notes';

type P = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return NOTES.map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const n = noteBySlug((await params).slug);
  if (!n) return {};
  return meta({ title: n.seoTitle, description: n.description, path: `/notes/${n.slug}`, image: n.hero.src });
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
  const n = noteBySlug((await params).slug);
  if (!n) notFound();

  const near = gemIndex().list
    .map((g) => ({ g, d: Math.round(km(n, g)) }))
    .filter((x) => x.d <= 60)
    .sort((a, b) => (b.g.rating ?? 0) * Math.log10((b.g.reviews ?? 1) + 1) - (a.g.rating ?? 0) * Math.log10((a.g.reviews ?? 1) + 1))
    .slice(0, 6);
  const count = (o: Zone['opens']) => CORBETT_ZONES.filter((z) => z.opens === o).length;

  const P = (src: string, alt: string, caption?: string, wide = false): NotePhoto => ({ src: `/notes/corbett/${src}.jpg`, alt, caption, wide });

  return (
    <article>
      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'Article', headline: n.title, description: n.description,
        image: abs(n.hero.src), url: abs(`/notes/${n.slug}`), datePublished: '2026-10-08',
        author: { '@type': 'Organization', name: 'Beyond Explored' },
        about: { '@type': 'TouristDestination', name: 'Jim Corbett National Park', geo: { '@type': 'GeoCoordinates', latitude: n.lat, longitude: n.lng } },
      }} />
      <GuideEnd text="Planning Corbett? Tell us your dates — we’ll check which zones are open and sort the stay." label="Plan Corbett" href="#enquire" />

      <div className="wrap pt-6">
        <Breadcrumbs items={[{ name: 'Field notes', path: '/notes' }, { name: n.place, path: `/notes/${n.slug}` }]} />
      </div>

      <header className="wrap mt-8 grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div className="min-w-0">
          <p className="kicker">Field notes · {n.stateName} · visited {n.visited}</p>
          <h1 className="mt-2 text-balance text-[32px] font-semibold leading-[1.08] tracking-tightest sm:text-[44px]">{n.title}</h1>
          <p className="mt-4 text-lg leading-relaxed text-mute">{n.intro}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#zones" className="btn">See the 8 zones</a>
            <a href="#eat" className="btn-secondary">Where to eat</a>
          </div>
        </div>
        <Photo p={n.hero} />
      </header>

      <div className="wrap mt-16 grid gap-12 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-16">
          {/* zones */}
          <section id="zones" className="scroll-mt-20" {...guide('Bookmark this — most people only find out a zone is shut when they reach the gate.', { label: 'Plan Corbett', href: '#enquire' })}>
            <h2 className="text-[28px] font-semibold tracking-headline sm:text-[32px]">8 zones. Three dates.</h2>
            <p className="mt-2 text-[17px] text-mute">Corbett isn’t one park you just walk into. It’s split into eight safari zones, each with its own gate — and they don’t all open together.</p>

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
              <Photo p={P('amdanda-gate-bijrani', 'Amdanda gate, the entry to the Bijrani zone in Corbett', 'Amdanda gate — the way into Bijrani, which opens on 15 October.')} />
              <Photo p={P('gate-signboard', 'Corbett Tiger Reserve signboard pointing to Dhangarhi gate and Durga Devi gate', 'Dhangarhi (for Dhikala) and Durga Devi gates — both open from 15 November.')} />
            </div>
          </section>

          {/* tigers */}
          <section {...guide('Inside-the-jungle rooms go first. A month ahead is the minimum, not the ideal.', { label: 'Help me book', href: '#enquire' })}>
            <h2 className="text-[28px] font-semibold tracking-headline sm:text-[32px]">Want to actually see a tiger? Sleep in the jungle.</h2>
            <div className="mt-4 space-y-4 text-[17px] leading-relaxed">
              <p>A morning jeep safari from Ramnagar is fun, but you get a few hours and a lot of other jeeps. If spotting animals — and the tiger — is the point, stay <b>inside</b> the reserve at one of the forest rest houses. You’re already in the jungle at dawn and dusk, when animals move.</p>
              <p><b>Book at least one month ahead</b> on the official Corbett Tiger Reserve website. The rooms inside the zones are limited and popular dates go the day booking opens. Day safari permits also sell out on weekends and holidays.</p>
            </div>
            <ul className="mt-5 space-y-2.5 text-[15px]">
              {[
                'Book only on the official site — lookalike sites and agents add big markups, and permits bought from the wrong place can be cancelled.',
                'Use the same ID at the gate that you used when booking — they check it.',
                'Take the early-morning slot. Cooler, quieter, and better odds.',
                'Bijrani (from 15 Oct) is the easiest first safari; Dhikala (from 15 Nov) is the deepest, for the overnight stay.',
              ].map((t) => <li key={t} className="flex gap-2"><span className="text-blue">●</span>{t}</li>)}
            </ul>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href={CORBETT_OFFICIAL} target="_blank" rel="noreferrer" className="btn-secondary">Official booking site</a>
              <a href="#enquire" className="link-arrow self-center">Or let us book it for you</a>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <Photo p={P('safari-gypsy', 'Open safari gypsy parked by the forest at Corbett', 'Safari gypsies wait by the gates from before sunrise.')} />
              <Photo p={P('forest-road-morning', 'Early-morning sunlight on the forest road through Corbett', 'The forest road at 7am — this is the light you want.')} />
            </div>
          </section>

          {/* eat */}
          <section id="eat" className="scroll-mt-20" {...guide('Busy on weekends — book a table or go early.', { label: 'Plan the trip', href: '#enquire' })}>
            <p className="kicker">Where we ate</p>
            <h2 className="mt-1 text-[28px] font-semibold tracking-headline sm:text-[32px]">Village Vatika, Ramnagar.</h2>
            <div className="mt-4 space-y-4 text-[17px] leading-relaxed">
              <p>The food was <b>amazing</b> — and it’s right on the main road (NH309 at Ladwachaur, Ramnagar), so it’s easy to reach after an evening safari.</p>
              <p>The best part: you can <b>bring your own whisky or drinks</b>, sit in the garden and order food around it. Almost everyone there was a family — kids on the play area, parents at the tables under the lights. Relaxed, not rowdy.</p>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {[
                ['Main road', 'NH309, Ladwachaur, Ramnagar'],
                ['Bring your own', 'Whisky, beer or wine — they serve the food'],
                ['Family crowd', 'Garden seating and a kids’ play area'],
              ].map(([h, t]) => <div key={h} className="card p-5"><p className="font-semibold">{h}</p><p className="mt-1 text-[15px] text-mute">{t}</p></div>)}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Photo p={P('village-vatika-entrance', 'Entrance arch of Village Vatika restaurant covered in creepers', 'The entrance, right off the main road.')} />
              <Photo p={P('village-vatika-night', 'Night seating at Village Vatika among potted plants and warm lights', 'Night seating — this is where you want to be.')} />
              <Photo p={P('village-vatika-garden', 'Lawn and kids’ play area at Village Vatika', 'The lawn and play area — why it’s full of families.')} className="col-span-2 sm:col-span-1" />
            </div>
            <p className="mt-4 text-sm text-faint">Their listing says open daily about 10am–10:30pm. Drink responsibly — and don’t drive after.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href="https://www.google.com/maps/search/?api=1&query=Village+Vatika+Restaurant+Ramnagar" target="_blank" rel="noreferrer" className="btn-secondary">Directions</a>
            </div>
          </section>

          {/* getting there */}
          <section>
            <h2 className="text-[28px] font-semibold tracking-headline sm:text-[32px]">Getting there.</h2>
            <p className="mt-2 text-[17px] text-mute">Ramnagar is the base town for most gates. From Delhi it’s a straight drive via Moradabad; the last stretch past the Kosi river is where Corbett starts to feel like Corbett.</p>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Photo p={P('highway-to-ramnagar', 'Highway sign towards Moradabad and Bareilly on the drive to Ramnagar', 'On the highway towards Moradabad.')} />
              <Photo p={P('kosi-barrage', 'Kosi river barrage at Ramnagar', 'The Kosi barrage at Ramnagar.')} />
              <Photo p={P('sal-forest', 'Sal forest at Jim Corbett', 'Sal forest — you’re in.')} className="col-span-2 sm:col-span-1" />
            </div>
          </section>

          {near.length > 0 && (
            <section {...guide('Extra day? These are within an hour or two of Ramnagar.', { label: 'Add to my trip', href: '#enquire' })}>
              <h2 className="text-[28px] font-semibold tracking-headline sm:text-[32px]">Hidden gems near Corbett</h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {near.map(({ g, d }) => <GemCard key={g.id} g={asCard(g, `${d} km from Corbett`)} />)}
              </div>
            </section>
          )}

          <section id="enquire" className="scroll-mt-16" {...guideQuiet}>
            <h2 className="text-[28px] font-semibold tracking-headline sm:text-[32px]">Plan Corbett with us</h2>
            <p className="mt-1 text-[17px] text-mute">Tell us your dates — we’ll tell you which zones are open, and help with the jungle stay and safari. Free, on WhatsApp.</p>
            <div className="mt-5"><LeadForm kind="enquiry" source={`/notes/${n.slug}`} places={[{ slug: 'jim-corbett', name: 'Jim Corbett' }]} defaultPlace="Jim Corbett" /></div>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-16 lg:self-start">
          <div className="card p-6">
            <p className="text-lg font-semibold">The short version</p>
            <ul className="mt-3 space-y-2 text-[15px] text-mute">
              <li>🗓️ 3 zones all year · Bijrani from 15 Oct · 4 more from 15 Nov</li>
              <li>🐅 For tigers, stay inside the jungle</li>
              <li>📅 Book 1 month+ ahead, official site only</li>
              <li>🍽️ Dinner: Village Vatika, bring your own drinks</li>
            </ul>
            <a href="#enquire" className="btn mt-5 w-full justify-center">Plan my Corbett trip</a>
            <Link href="/hidden-gems/uttarakhand" className="mt-3 block text-center text-[15px] text-blue-link hover:underline">More in Uttarakhand</Link>
          </div>
        </aside>
      </div>
    </article>
  );
}
