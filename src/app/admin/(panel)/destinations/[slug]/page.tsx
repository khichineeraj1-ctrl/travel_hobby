import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readDb } from '@/lib/db';
import { AdminHeader, Area, BackLink, Check, DangerZone, Field, Flash, Panel, Select, Text } from '@/components/admin/ui';
import { PhotoInput } from '@/components/admin/PhotoInput';
import { deleteDestination, saveDestination } from '../../../actions';
import { allMonths, monthShort } from '@/lib/months';
import type { Crew, Destination } from '@/lib/types';

const BLANK: Destination = {
  slug: '', name: '', state: '', stateSlug: '', lat: 0, lng: 0, altitudeM: 0, terrain: 'hills',
  hook: '', about: '', vibes: [], bestMonths: [], okMonths: [], skip: [], crowd: 2,
  budgetPerDay: [1000, 2500], crewFit: { solo: 4, duo: 4, squad: 4, fam: 3 }, minDays: 2, idealDays: 3,
  signal: 'patchy', airport: null, railhead: null, roadFactor: 1.5, doThis: [], theIck: [], stayTypes: [],
  palette: ['#2F5D50', '#8FD3FF'], published: false,
};

const TERRAIN = ['mountain', 'high-altitude', 'hills', 'coast', 'island', 'plains', 'desert'];
const CREW: [Crew, string][] = [['solo', 'Solo'], ['duo', 'Couple'], ['squad', 'Squad'], ['fam', 'Family']];

export default async function EditDestination({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { slug } = await params;
  const { ok, err } = await searchParams;
  const db = readDb();
  const isNew = slug === 'new';
  const d = isNew ? BLANK : db.destinations.find((x) => x.slug === slug);
  if (!d) notFound();

  const MonthGrid = ({ name, selected }: { name: string; selected: number[] }) => (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
      {allMonths.map((m) => (
        <label key={m} className="cursor-pointer">
          <input type="checkbox" name={name} value={m} defaultChecked={selected.includes(m)} className="peer sr-only" />
          <span className="block rounded-xl border border-line py-2 text-center text-sm transition peer-checked:border-blue peer-checked:bg-blue peer-checked:text-white">{monthShort(m)}</span>
        </label>
      ))}
    </div>
  );

  return (
    <>
      <BackLink href="/admin/destinations" label="All places" />
      <AdminHeader
        title={isNew ? 'New place' : d.name}
        sub={isNew ? 'Fill the basics, save as draft, then publish when it’s ready.' : `/places/${d.slug}`}
        action={!isNew && d.published !== false ? <Link href={`/places/${d.slug}`} target="_blank" className="btn-secondary !py-2 !text-[15px]">View live ↗</Link> : undefined}
      />
      <Flash ok={ok} err={err} />

      <form action={saveDestination} className="space-y-6 pb-28">
        <input type="hidden" name="originalSlug" value={isNew ? '' : d.slug} />

        <Panel title="Basics">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Name"><Text name="name" defaultValue={d.name} required placeholder="Ziro Valley" /></Field>
            <Field label="State"><Text name="state" defaultValue={d.state} required placeholder="Arunachal Pradesh" /></Field>
          </div>
          {isNew ? (
            <Field label="URL slug" hint="Leave empty to generate from name + state (e.g. ziro-valley-arunachal-pradesh). This can’t be changed later — it’s the SEO URL.">
              <Text name="slug" placeholder="auto" />
            </Field>
          ) : (
            <p className="text-sm text-mute">URL: <code className="rounded bg-paper px-1.5 py-0.5">/places/{d.slug}</code> — fixed to protect search rankings.</p>
          )}
          <Field label="Hook" hint="One line, how a friend would text it. Shows on cards."><Text name="hook" defaultValue={d.hook} maxLength={140} /></Field>
          <Field label="About" hint="2–3 honest sentences."><Area name="about" defaultValue={d.about} /></Field>
          <Check name="published" label="Published (visible on the live site)" defaultChecked={d.published !== false} />
        </Panel>

        <div id="photo" className="scroll-mt-6">
          <Panel title="Photo" sub="Replaces the gradient card on the site and is used for social sharing.">
            <PhotoInput current={d.image} />
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Photo credit" className="sm:col-span-1"><Text name="imageCredit" defaultValue={d.imageCredit} placeholder="@photographer" /></Field>
              <Field label="Fallback colour 1"><Text type="color" name="color1" defaultValue={d.palette[0]} className="!h-11 !p-1" /></Field>
              <Field label="Fallback colour 2"><Text type="color" name="color2" defaultValue={d.palette[1]} className="!h-11 !p-1" /></Field>
            </div>
          </Panel>
        </div>

        <Panel title="Vibes">
          <div className="flex flex-wrap gap-2.5">
            {db.vibes.map((v) => (
              <label key={v.id} className="cursor-pointer">
                <input type="checkbox" name="vibes" value={v.id} defaultChecked={d.vibes.includes(v.id)} className="peer sr-only" />
                <span className="chip peer-checked:border-blue peer-checked:bg-blue-soft peer-checked:ring-1 peer-checked:ring-blue">{v.emoji} {v.label}</span>
              </label>
            ))}
          </div>
        </Panel>

        <Panel title="Season" sub="Drives the month pages, the planner and the best-time chart.">
          <Field label="Best months"><MonthGrid name="bestMonths" selected={d.bestMonths} /></Field>
          <Field label="Doable months"><MonthGrid name="okMonths" selected={d.okMonths} /></Field>
          <Field label="Months to skip, and why" hint="One per line: months | reason   e.g.  6,7,8 | monsoon landslides on the approach road">
            <Area name="skip" rows={3} defaultValue={d.skip.map((s) => `${s.months.join(',')} | ${s.why}`).join('\n')} />
          </Field>
        </Panel>

        <Panel title="Trip fit">
          <div className="grid gap-5 sm:grid-cols-4">
            <Field label="Crowd (1–5)" hint="1 = empty, 5 = instagram found it">
              <Select name="crowd" defaultValue={d.crowd}>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</Select>
            </Field>
            <Field label="Mobile network">
              <Select name="signal" defaultValue={d.signal}><option value="none">No signal</option><option value="patchy">Patchy</option><option value="decent">Decent</option></Select>
            </Field>
            <Field label="Min days"><Text type="number" name="minDays" min={1} max={30} defaultValue={d.minDays} /></Field>
            <Field label="Ideal days"><Text type="number" name="idealDays" min={1} max={30} defaultValue={d.idealDays} /></Field>
            <Field label="Budget from (₹/day)"><Text type="number" name="budgetLo" min={0} step={100} defaultValue={d.budgetPerDay[0]} /></Field>
            <Field label="Budget to (₹/day)"><Text type="number" name="budgetHi" min={0} step={100} defaultValue={d.budgetPerDay[1]} /></Field>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Crew fit (1–5)</p>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
              {CREW.map(([c, l]) => (
                <Field key={c} label={l}>
                  <Select name={`crew_${c}`} defaultValue={d.crewFit[c]}>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</Select>
                </Field>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Location & getting there" sub="Used to calculate travel time from every starting city.">
          <div className="grid gap-5 sm:grid-cols-4">
            <Field label="Latitude"><Text type="number" step="any" name="lat" defaultValue={d.lat || ''} required /></Field>
            <Field label="Longitude"><Text type="number" step="any" name="lng" defaultValue={d.lng || ''} required /></Field>
            <Field label="Altitude (m)"><Text type="number" name="altitudeM" defaultValue={d.altitudeM} /></Field>
            <Field label="Terrain">
              <Select name="terrain" defaultValue={d.terrain}>{TERRAIN.map((t) => <option key={t}>{t}</option>)}</Select>
            </Field>
          </div>
          <Field label="Road slowness" hint="1.0 = highway all the way · 1.5 = hilly · 1.9 = mountain switchbacks">
            <Text type="number" step="0.05" min={1} max={2.5} name="roadFactor" defaultValue={d.roadFactor} className="max-w-[160px]" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Nearest airport"><Text name="airportName" defaultValue={d.airport?.name} placeholder="Leave empty if none" /></Field>
            <Field label="Airport lat"><Text type="number" step="any" name="airportLat" defaultValue={d.airport?.lat} /></Field>
            <Field label="Airport lng"><Text type="number" step="any" name="airportLng" defaultValue={d.airport?.lng} /></Field>
            <Field label="Nearest railhead"><Text name="railheadName" defaultValue={d.railhead?.name} placeholder="Leave empty if none" /></Field>
            <Field label="Railhead lat"><Text type="number" step="any" name="railheadLat" defaultValue={d.railhead?.lat} /></Field>
            <Field label="Railhead lng"><Text type="number" step="any" name="railheadLng" defaultValue={d.railhead?.lng} /></Field>
          </div>
        </Panel>

        <Panel title="Content" sub="One item per line.">
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Do this"><Area name="doThis" rows={6} defaultValue={d.doThis.join('\n')} /></Field>
            <Field label="The ick (honest cons)"><Area name="theIck" rows={6} defaultValue={d.theIck.join('\n')} /></Field>
            <Field label="Where to stay"><Area name="stayTypes" rows={6} defaultValue={d.stayTypes.join('\n')} /></Field>
          </div>
        </Panel>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/85 backdrop-blur lg:left-[240px]">
          <div className="mx-auto flex max-w-5xl items-center justify-end gap-3 px-5 py-3 sm:px-10">
            <Link href="/admin/destinations" className="text-[15px] text-mute hover:text-ink">Cancel</Link>
            <button className="btn">{isNew ? 'Create place' : 'Save changes'}</button>
          </div>
        </div>
      </form>

      {!isNew && (
        <section className="card mb-24 border border-[#ffd2cc] p-6">
          <h2 className="text-lg font-semibold">Delete this place</h2>
          <p className="mb-4 text-sm text-mute">Removes it and its photo. The URL will 404 — consider unpublishing instead.</p>
          <DangerZone action={deleteDestination} hidden={{ slug: d.slug }} what={d.name} />
        </section>
      )}
    </>
  );
}
