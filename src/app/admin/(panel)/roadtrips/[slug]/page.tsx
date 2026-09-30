import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readDb } from '@/lib/db';
import { AdminHeader, Area, BackLink, Check, DangerZone, Field, Flash, Panel, Select, Text } from '@/components/admin/ui';
import { PhotoInput } from '@/components/admin/PhotoInput';
import { RouteMap } from '@/components/RoadTrip';
import { deleteRoadTrip, saveRoadTrip } from '../../../actions';
import { legs, totals } from '@/lib/roadtrips';
import { allMonths, monthShort } from '@/lib/months';
import type { RoadTrip } from '@/lib/types';

const BLANK: RoadTrip = {
  slug: '', title: '', hook: '', about: '', stops: [], roadFactor: 1.5, bestMonths: [], difficulty: 'moderate', vehicle: 'Any car',
  highlights: [], theIck: [], vibes: [], palette: ['#1E3A5F', '#FFB703'], published: false,
};

export default async function EditRoadTrip({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { slug } = await params;
  const { ok, err } = await searchParams;
  const db = readDb();
  const isNew = slug === 'new';
  const t = isNew ? BLANK : db.roadTrips.find((x) => x.slug === slug);
  if (!t) notFound();
  const stopsText = t.stops.map((s) => [s.name, s.lat, s.lng, s.nights, s.note ?? '', s.destSlug ?? '', s.legFactor ?? ''].join(' | ').replace(/( \| )+$/, '')).join('\n');

  return (
    <>
      <BackLink href="/admin/roadtrips" label="All road trips" />
      <AdminHeader title={isNew ? 'New road trip' : t.title} action={!isNew && t.published ? <Link href={`/road-trips/${t.slug}`} target="_blank" className="btn-secondary !py-2 !text-[15px]">View live ↗</Link> : undefined} />
      <Flash ok={ok} err={err} />

      {!isNew && t.stops.length > 1 && (
        <section className="card mb-6 grid gap-6 p-6 lg:grid-cols-[1fr_280px]">
          <RouteMap t={t} className="w-full" />
          <div className="text-sm">
            <p className="font-semibold">{totals(t).days} days · {totals(t).km.toLocaleString('en-IN')} km · ~{Math.round(totals(t).driveHours)} h driving</p>
            <ul className="mt-3 space-y-1 text-mute">{legs(t).map((l, i) => <li key={i}>{l.from} → {l.to}: {l.km} km, ~{l.hours} h</li>)}</ul>
            <p className="mt-3 text-xs text-faint">If a leg looks too long/short, set a per-leg factor (7th column) — e.g. 1.3 for plains into the hills.</p>
          </div>
        </section>
      )}

      <form action={saveRoadTrip} className="space-y-6">
        <input type="hidden" name="originalSlug" value={isNew ? '' : t.slug} />
        <Panel title="Basics">
          <Field label="Title"><Text name="title" defaultValue={t.title} required placeholder="Manali → Leh → Turtuk" /></Field>
          <Field label="Hook"><Text name="hook" defaultValue={t.hook} maxLength={160} /></Field>
          <Field label="About"><Area name="about" rows={3} defaultValue={t.about} /></Field>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Difficulty">
              <Select name="difficulty" defaultValue={t.difficulty}><option value="easy">Easy drive</option><option value="moderate">Moderate</option><option value="hardcore">Hardcore</option></Select>
            </Field>
            <Field label="Vehicle"><Text name="vehicle" defaultValue={t.vehicle} /></Field>
            <Field label="Road slowness (1–2.5)" hint="1 highway · 1.5 hills · 1.9 high mountains"><Text type="number" step="0.05" min={1} max={2.5} name="roadFactor" defaultValue={t.roadFactor} /></Field>
          </div>
          <Check name="published" label="Published" defaultChecked={t.published} />
        </Panel>

        <Panel title="Stops" sub="One per line, in driving order: Name | lat | lng | nights | note | place-slug | leg factor. Only the first four are required.">
          <Area name="stops" rows={Math.max(6, t.stops.length + 2)} defaultValue={stopsText} className="font-mono text-xs" placeholder={'Manali | 32.2432 | 77.1892 | 0 | Start early\nJispa | 32.6426 | 77.186 | 1 | Riverside camps'} />
        </Panel>

        <Panel title="Season & vibes">
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
            {allMonths.map((m) => (
              <label key={m} className="cursor-pointer">
                <input type="checkbox" name="bestMonths" value={m} defaultChecked={t.bestMonths.includes(m)} className="peer sr-only" />
                <span className="block rounded-xl border border-line py-2 text-center text-sm peer-checked:border-blue peer-checked:bg-blue peer-checked:text-white">{monthShort(m)}</span>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2.5">
            {db.vibes.map((v) => (
              <label key={v.id} className="cursor-pointer">
                <input type="checkbox" name="vibes" value={v.id} defaultChecked={t.vibes.includes(v.id)} className="peer sr-only" />
                <span className="chip peer-checked:border-blue peer-checked:bg-blue-soft peer-checked:ring-1 peer-checked:ring-blue">{v.emoji} {v.label}</span>
              </label>
            ))}
          </div>
        </Panel>

        <Panel title="Details">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Highlights (one per line)"><Area name="highlights" rows={5} defaultValue={t.highlights.join('\n')} /></Field>
            <Field label="The ick (one per line)"><Area name="theIck" rows={5} defaultValue={t.theIck.join('\n')} /></Field>
            <Field label="Permits"><Text name="permits" defaultValue={t.permits} /></Field>
            <Field label="Fuel note"><Text name="fuelNote" defaultValue={t.fuelNote} /></Field>
            <Field label="Card colour 1"><Text type="color" name="color1" defaultValue={t.palette[0]} className="!h-11 !p-1" /></Field>
            <Field label="Card colour 2"><Text type="color" name="color2" defaultValue={t.palette[1]} className="!h-11 !p-1" /></Field>
          </div>
        </Panel>

        <Panel title="Cover photo" sub="Optional — without one, cards show the route map."><PhotoInput current={t.image} /></Panel>
        <button className="btn">{isNew ? 'Create road trip' : 'Save road trip'}</button>
      </form>

      {!isNew && (
        <section className="card mb-10 mt-6 border border-[#ffd2cc] p-6">
          <h2 className="mb-4 text-lg font-semibold">Delete road trip</h2>
          <DangerZone action={deleteRoadTrip} hidden={{ slug: t.slug }} what="this road trip" />
        </section>
      )}
    </>
  );
}
