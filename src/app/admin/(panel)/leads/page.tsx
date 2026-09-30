import Link from 'next/link';
import { readDb } from '@/lib/db';
import { AdminHeader, Badge, Flash, STATUS_TONE, ago } from '@/components/admin/ui';
import { LEAD_LABEL } from '@/lib/booking';
import { updateLead } from '../../actions';
import type { LeadKind } from '@/lib/types';

const TABS: { id: 'all' | LeadKind; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'enquiry', label: 'Trip enquiries' }, { id: 'dropoff', label: 'Booking drop-offs' }, { id: 'event', label: 'Event alerts' },
  { id: 'partner', label: 'Partners' }, { id: 'newsletter', label: 'Newsletter' },
];

export default async function Leads({ searchParams }: { searchParams: Promise<{ kind?: string; status?: string; ok?: string; err?: string }> }) {
  const { kind = 'all', status = 'active', ok, err } = await searchParams;
  const db = readDb();
  const items = db.leads
    .filter((l) => kind === 'all' || l.kind === kind)
    .filter((l) => status === 'all' || (status === 'active' ? l.status === 'new' || l.status === 'contacted' : l.status === status));
  const summary = (l: (typeof items)[number]) => {
    const d = l.data;
    if (l.kind === 'enquiry') return [d.place || 'Anywhere', d.when, d.groupSize && `${d.groupSize} pax`, d.budget].filter(Boolean).join(' · ');
    if (l.kind === 'dropoff') return `${d.itemName ?? d.item}${d.dates ? ` · ${d.dates}` : ''}`;
    if (l.kind === 'event') return [d.eventName, d.wants, d.from && `from ${d.from}`].filter(Boolean).join(' · ');
    if (l.kind === 'partner') return [d.business, d.partnerType, d.location].filter(Boolean).join(' · ');
    return l.email ?? l.phone ?? '';
  };
  const qs = (k: string, s: string) => `/admin/leads?kind=${k}&status=${s}`;

  return (
    <>
      <AdminHeader
        title="Leads"
        sub="Drop-offs are people who started a booking but didn’t finish — they convert automatically if they complete it."
        action={<a href="/admin/export/leads" className="btn-secondary !py-2 !text-[15px]">Export CSV</a>}
      />
      <Flash ok={ok} err={err} />
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const n = db.leads.filter((l) => (t.id === 'all' || l.kind === t.id) && l.status === 'new').length;
          return <Link key={t.id} href={qs(t.id, status)} className={`chip ${kind === t.id ? 'chip-on' : ''}`}>{t.label}{n ? <span className="rounded-full bg-eyebrow px-1.5 text-xs text-white">{n}</span> : null}</Link>;
        })}
      </div>
      <div className="mb-5 flex gap-4 text-sm">
        {[['active', 'Active'], ['converted', 'Converted'], ['closed', 'Closed'], ['all', 'All']].map(([s, l]) => (
          <Link key={s} href={qs(kind, s)} className={status === s ? 'font-semibold text-ink' : 'text-blue-link hover:underline'}>{l}</Link>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[15px]">
          <thead className="border-b border-line text-xs font-semibold uppercase tracking-wide text-faint">
            <tr><th className="px-5 py-3">Who</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Details</th><th className="px-5 py-3">When</th><th className="px-5 py-3">Status</th></tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <tr key={l.id} className="border-b border-line/60 last:border-0 hover:bg-paper/60">
                <td className="px-5 py-3"><Link href={`/admin/leads/${l.id}`} className="text-blue-link hover:underline">{l.name || l.email || l.phone}</Link><span className="block text-xs text-faint">{l.phone ?? l.email}</span></td>
                <td className="px-5 py-3 text-sm">{LEAD_LABEL[l.kind]}</td>
                <td className="max-w-xs truncate px-5 py-3 text-sm text-mute">{summary(l)}</td>
                <td className="whitespace-nowrap px-5 py-3 text-sm text-faint">{ago(l.createdAt)}</td>
                <td className="px-5 py-3">
                  <form action={updateLead} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="return" value={qs(kind, status)} />
                    <select name="status" defaultValue={l.status} className="rounded-lg border border-line bg-white px-2 py-1 text-sm">
                      <option value="new">New</option><option value="contacted">Contacted</option><option value="converted">Converted</option><option value="closed">Closed</option>
                    </select>
                    <button className="text-sm text-blue-link">Set</button>
                  </form>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-mute">No leads here.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-faint"><Badge tone="orange">New</Badge> counts show leads nobody has contacted yet.</p>
    </>
  );
}
