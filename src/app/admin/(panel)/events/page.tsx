import Link from 'next/link';
import { readDb } from '@/lib/db';
import { AdminHeader, Badge, Flash } from '@/components/admin/ui';
import { CATEGORY_LABEL, countdown, fmtEventDates, phase } from '@/lib/events';
import { importEvents, setEventStatus } from '../../actions';

const TABS = [['upcoming', 'Upcoming'], ['suggested', 'Suggested'], ['past', 'Past'], ['draft', 'Drafts']] as const;

const SAMPLE = `[
  {
    "name": "Losar Festival Tawang",
    "startDate": "2027-02-07",
    "endDate": "2027-02-09",
    "dateStatus": "expected",
    "town": "Tawang",
    "state": "Arunachal Pradesh",
    "lat": 27.586, "lng": 91.859,
    "category": "culture",
    "hook": "monpa new year with monastery dances",
    "about": "...",
    "sourceUrl": "https://…"
  }
]`;

export default async function Events({ searchParams }: { searchParams: Promise<{ tab?: string; ok?: string; err?: string }> }) {
  const { tab = 'upcoming', ok, err } = await searchParams;
  const db = readDb();
  const alerts = (slug: string) => db.leads.filter((l) => l.kind === 'event' && l.data.eventSlug === slug && l.status !== 'closed').length;
  const list = db.events
    .filter((e) =>
      tab === 'suggested' ? e.status === 'suggested'
      : tab === 'draft' ? e.status === 'draft'
      : tab === 'past' ? e.status === 'published' && phase(e) === 'past'
      : e.status === 'published' && phase(e) !== 'past')
    .sort((a, b) => (tab === 'past' ? b.startDate.localeCompare(a.startDate) : a.startDate.localeCompare(b.startDate)));
  const count = (t: string) => db.events.filter((e) => (t === 'suggested' ? e.status === 'suggested' : t === 'draft' ? e.status === 'draft' : t === 'past' ? e.status === 'published' && phase(e) === 'past' : e.status === 'published' && phase(e) !== 'past')).length;

  return (
    <>
      <AdminHeader
        title="Events"
        sub="Events show up across the site — home rail, place pages, road trips and the planner (as a +6 boost when they fall in the chosen month)."
        action={<Link href="/admin/events/new" className="btn">Add an event</Link>}
      />
      <Flash ok={ok} err={err} />
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map(([id, label]) => (
          <Link key={id} href={`/admin/events?tab=${id}`} className={`chip ${tab === id ? 'chip-on' : ''}`}>
            {label} <span className="text-xs text-mute">{count(id)}</span>
          </Link>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[15px]">
          <thead className="border-b border-line text-xs font-semibold uppercase tracking-wide text-faint">
            <tr><th className="px-5 py-3">Event</th><th className="px-5 py-3">Dates</th><th className="px-5 py-3">Where</th><th className="px-5 py-3">Alerts</th><th className="px-5 py-3" /></tr>
          </thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.slug} className="border-b border-line/60 last:border-0 hover:bg-paper/60">
                <td className="px-5 py-3">
                  <Link href={`/admin/events/${e.slug}`} className="text-blue-link hover:underline">{e.name}</Link>
                  <span className="block text-xs text-faint">{CATEGORY_LABEL[e.category]}{e.sourceUrl ? ' · has source' : ' · no source'}</span>
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-sm">{fmtEventDates(e)}<span className="block text-xs text-faint">{e.dateStatus === 'expected' ? 'Expected · ' : ''}{countdown(e)}</span></td>
                <td className="px-5 py-3 text-sm">{e.town}<span className="block text-xs text-faint">{e.state}</span></td>
                <td className="px-5 py-3">{alerts(e.slug) ? <Badge tone="orange">{alerts(e.slug)} waiting</Badge> : <span className="text-sm text-faint">—</span>}</td>
                <td className="whitespace-nowrap px-5 py-3 text-right">
                  {e.status === 'suggested' ? (
                    <div className="flex justify-end gap-2">
                      <form action={setEventStatus}><input type="hidden" name="slug" value={e.slug} /><input type="hidden" name="status" value="published" /><input type="hidden" name="return" value="/admin/events?tab=suggested" /><button className="btn btn-sm">Approve</button></form>
                      <form action={setEventStatus}><input type="hidden" name="slug" value={e.slug} /><input type="hidden" name="status" value="reject" /><button className="rounded-full px-3 py-2 text-sm text-mute hover:text-[#d70015]">Dismiss</button></form>
                    </div>
                  ) : e.status === 'published' ? (
                    <Link href={`/events/${e.slug}`} target="_blank" className="text-sm text-mute hover:text-ink">View ↗</Link>
                  ) : <Badge tone="gray">Draft</Badge>}
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-mute">{tab === 'suggested' ? 'No suggestions waiting. Import some below, or connect the ingest API.' : 'Nothing here.'}</td></tr>}
          </tbody>
        </table>
      </div>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-lg font-semibold">Import events</h2>
          <p className="mt-1 text-sm text-mute">Paste JSON from a research sheet or another tool. With auto-publish on (Site content), events with a source go live; the rest land in <b>Suggested</b>.</p>
          <form action={importEvents} className="mt-4 space-y-3">
            <textarea name="json" rows={10} className="field font-mono text-xs" placeholder={SAMPLE} />
            <button className="btn btn-sm">Import as suggestions</button>
          </form>
        </div>
        <div className="card p-6 text-sm">
          <h2 className="text-lg font-semibold">Auto-pickup (ingest API)</h2>
          <p className="mt-1 text-mute">Let a scraper, a Google Sheet script or a scheduled research job push new events here.</p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-mute">
            <li>Add <code className="rounded bg-paper px-1">EVENTS_INGEST_TOKEN=some-long-secret</code> to <code className="rounded bg-paper px-1">.env.local</code> and restart.</li>
            <li>POST JSON to <code className="rounded bg-paper px-1">/api/events/ingest</code> with header <code className="rounded bg-paper px-1">Authorization: Bearer &lt;token&gt;</code>.</li>
            <li>Events with a source link go live automatically (toggle in Site content); others wait under <b>Suggested</b>. Duplicates (same name + year) are skipped.</li>
          </ol>
          <p className="mt-4 text-xs text-faint">Status: {process.env.EVENTS_INGEST_TOKEN ? <span className="text-good">enabled</span> : 'disabled (no token set)'}</p>
        </div>
      </section>
    </>
  );
}
