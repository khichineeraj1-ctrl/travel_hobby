import Link from 'next/link';
import { readDb } from '@/lib/db';
import { AdminHeader, Badge, Flash } from '@/components/admin/ui';
import { isSandbox, onGround, ratesDueCount, ratesEnabled, withLiveBudget } from '@/lib/rates';
import { inr } from '@/lib/format';
import { refreshStayRates } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function Rates({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { ok, err } = await searchParams;
  const db = readDb();
  const on = ratesEnabled();
  const due = ratesDueCount();
  const og = onGround(db.settings);
  const places = db.destinations.filter((d) => d.published !== false).sort((a, b) => a.name.localeCompare(b.name));
  const meta = db.rateMeta;
  const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return (
    <>
      <AdminHeader
        title="Stay prices"
        sub={on
          ? `Live nightly rates from LiteAPI (1 room, 2 adults, taxes incl.) for stays within 25 km. Budget/day = room ÷ 2 + ${inr(og[0])}–${inr(og[1])} food & local travel.`
          : 'Off. Add LITEAPI_KEY in Railway (free key from liteapi.travel) to replace the hand-written budgets with live hotel prices.'}
        action={on ? <form action={refreshStayRates}><button className="btn">{due ? `Fetch ${due} due` : 'Check for updates'}</button></form> : undefined}
      />
      <Flash ok={ok} err={err} />
      {on && isSandbox() && (
        <p className="card mb-6 border-eyebrow/40 p-4 text-sm"><b>Sandbox key detected.</b> Prices below are test data and are <b>not</b> shown on the public site. Switch LITEAPI_KEY to your production key to go live.</p>
      )}
      <p className="mb-6 text-sm text-mute">
        Refreshes weekly per place (failed places retry every 6 h) and when you save a place.
        {meta?.lastRun ? ` Last run ${new Date(meta.lastRun).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.` : ''}
        {meta?.lastError ? ` Last error: ${meta.lastError}.` : ''} Places with fewer than 3 priced stays keep their hand-written budget.
      </p>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-[15px]">
          <thead className="text-xs text-faint"><tr className="border-b border-line/70">
            <th className="px-4 py-3 font-normal">Place</th><th className="px-4 py-3 font-normal">Stays</th>
            <th className="px-4 py-3 font-normal">Cheapest</th><th className="px-4 py-3 font-normal">Budget · typical · comfy</th>
            <th className="px-4 py-3 font-normal">Budget/day on site</th><th className="px-4 py-3 font-normal">Checked</th><th />
          </tr></thead>
          <tbody className="divide-y divide-line/70">
            {places.map((d) => {
              const r = db.stayRates?.[d.slug];
              const shown = withLiveBudget(d, db.settings);
              return (
                <tr key={d.slug}>
                  <td className="px-4 py-3"><Link href={`/places/${d.slug}`} target="_blank" className="hover:text-blue-link">{d.name}</Link></td>
                  <td className="px-4 py-3">{r ? r.count : '—'}{r?.error && <span className="ml-2"><Badge tone="orange">error</Badge></span>}</td>
                  <td className="px-4 py-3">{r?.count ? inr(r.min) : '—'}</td>
                  <td className="px-4 py-3 text-mute">{r?.count ? `${inr(r.p25)} · ${inr(r.median)} · ${inr(r.p75)}` : '—'}</td>
                  <td className="px-4 py-3">{inr(shown.budgetPerDay[0])}–{inr(shown.budgetPerDay[1])} {shown.live ? <Badge tone="green">live</Badge> : <Badge tone="gray">estimate</Badge>}</td>
                  <td className="px-4 py-3 text-sm text-mute" title={r?.error}>{r ? day(r.at) : '—'}</td>
                  <td className="px-4 py-3">{on && <form action={refreshStayRates}><input type="hidden" name="slug" value={d.slug} /><button className="text-sm text-blue-link hover:underline">Re-fetch</button></form>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
