import { readDb } from '@/lib/db';
import { AdminHeader, Area, Check, Field, Flash, Panel, Text } from '@/components/admin/ui';
import { saveSettings } from '../../actions';

export default async function Settings({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { ok, err } = await searchParams;
  const { settings: s, destinations } = readDb();
  const pitch = [...s.pitch, ...Array(Math.max(0, 6 - s.pitch.length)).fill({ title: '', body: '' })].slice(0, 6);
  return (
    <>
      <AdminHeader title="Site content" sub="Headlines, banner, buttons and featured places on the home page." />
      <Flash ok={ok} err={err} />
      <form action={saveSettings} className="space-y-6 pb-28">
        <Panel title="Announcement banner" sub="The strip under the top navigation.">
          <Check name="bannerEnabled" label="Show banner" defaultChecked={s.banner.enabled} />
          <Field label="Text" hint="Tokens filled in live: {month}, {monthSlug}, {peakCount} (places at their best this month)."><Text name="bannerText" defaultValue={s.banner.text} /></Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Link label"><Text name="bannerLinkLabel" defaultValue={s.banner.linkLabel} /></Field>
            <Field label="Link URL" hint="e.g. /when/october or /vibe/stargazing"><Text name="bannerLinkHref" defaultValue={s.banner.linkHref} /></Field>
          </div>
        </Panel>

        <Panel title="Hero">
          <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
            <Field label="Big title"><Text name="heroTitle" defaultValue={s.hero.title} /></Field>
            <Field label="Tagline"><Text name="heroTagline" defaultValue={s.hero.tagline} /></Field>
          </div>
          <Field label="Sub-text"><Text name="heroSub" defaultValue={s.hero.sub} /></Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Link 1 (scrolls to planner)"><Text name="heroPrimaryCta" defaultValue={s.hero.primaryCta} /></Field>
            <Field label="Link 2 (random pick)"><Text name="heroSecondaryCta" defaultValue={s.hero.secondaryCta} /></Field>
          </div>
        </Panel>

        <div id="featured" className="scroll-mt-6">
          <Panel title="Featured rail" sub="Pinned places appear first in the big card rail; the rest fill in with what’s in season.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Heading (bold)"><Text name="railTitle" defaultValue={s.rail.title} /></Field>
              <Field label="Heading (grey)" hint="“this month” is replaced with the current month"><Text name="railSubtitle" defaultValue={s.rail.subtitle} /></Field>
            </div>
            <div className="grid max-h-72 gap-x-6 gap-y-2 overflow-y-auto rounded-xl bg-paper p-4 sm:grid-cols-3">
              {destinations.filter((d) => d.published !== false).map((d) => (
                <Check key={d.slug} name="featured" value={d.slug} label={d.name} defaultChecked={s.featured.includes(d.slug)} />
              ))}
            </div>
          </Panel>
        </div>

        <Panel title="Planner">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Heading (bold)"><Text name="plannerTitle" defaultValue={s.planner.title} /></Field>
            <Field label="Heading (grey)"><Text name="plannerSubtitle" defaultValue={s.planner.subtitle} /></Field>
            <Field label="Main button"><Text name="plannerSubmit" defaultValue={s.planner.submitLabel} /></Field>
            <Field label="Random button"><Text name="plannerRoll" defaultValue={s.planner.rollLabel} /></Field>
          </div>
        </Panel>

        <Panel title="“Why Beyond Explored” tiles" sub="Leave a title empty to hide that tile.">
          <div className="grid gap-5 sm:grid-cols-2">
            {pitch.map((p, i) => (
              <div key={i} className="space-y-2 rounded-2xl bg-paper p-4">
                <Text name={`pitchTitle${i}`} defaultValue={p.title} placeholder={`Tile ${i + 1} title`} />
                <Area name={`pitchBody${i}`} rows={2} defaultValue={p.body} placeholder="Body" />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Events" sub="From the weekly event scout, the ingest API and JSON import.">
          <Check name="autoPublishEvents" label="Publish incoming events automatically (only ones with a source link that haven’t ended; others go to Suggested)" defaultChecked={s.autoPublishEvents !== false} />
        </Panel>

        <Panel title="Best spots nearby" sub="Filters for spots discovered around each place. Ratings/reviews apply to Google Maps data only.">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm"><span className="text-mute">Minimum rating</span>
              <input name="spotMinRating" type="number" step="0.1" min="3" max="5" defaultValue={s.spots?.minRating ?? 4.2} className="field mt-1" /></label>
            <label className="block text-sm"><span className="text-mute">Minimum reviews</span>
              <input name="spotMinReviews" type="number" min="0" defaultValue={s.spots?.minReviews ?? 30} className="field mt-1" /></label>
            <label className="block text-sm"><span className="text-mute">Search radius (km)</span>
              <input name="spotRadiusKm" type="number" min="5" max="50" defaultValue={s.spots?.radiusKm ?? 35} className="field mt-1" /></label>
          </div>
        </Panel>

        <Panel title="Budget per day" sub="With live stay prices on, budget/day = room price ÷ 2 + this food & local-transport allowance per person (shown as an estimate on the site).">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm"><span className="text-mute">Food & local travel — low (₹/person/day)</span>
              <input name="onGroundLo" type="number" min="0" step="50" defaultValue={s.rates?.onGroundLo ?? 600} className="field mt-1" /></label>
            <label className="block text-sm"><span className="text-mute">Food & local travel — high (₹/person/day)</span>
              <input name="onGroundHi" type="number" min="0" step="50" defaultValue={s.rates?.onGroundHi ?? 1500} className="field mt-1" /></label>
          </div>
        </Panel>

        <Panel title="Footer">
          <Field label="Disclaimer"><Area name="footerNote" rows={2} defaultValue={s.footerNote} /></Field>
        </Panel>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/85 backdrop-blur lg:left-[240px]">
          <div className="mx-auto flex max-w-5xl justify-end px-5 py-3 sm:px-10">
            <button className="btn">Save changes</button>
          </div>
        </div>
      </form>
    </>
  );
}
