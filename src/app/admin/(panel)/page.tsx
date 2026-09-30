import Link from 'next/link';
import { readDb } from '@/lib/db';
import { AdminHeader, Badge } from '@/components/admin/ui';
import { currentMonth, monthLabel } from '@/lib/months';

export default function Overview() {
  const db = readDb();
  const live = db.destinations.filter((d) => d.published !== false);
  const drafts = db.destinations.filter((d) => d.published === false);
  const noPhoto = live.filter((d) => !d.image);
  const m = currentMonth();
  const peaking = live.filter((d) => d.bestMonths.includes(m));
  const recent = [...db.destinations].filter((d) => d.updatedAt).sort((a, b) => (b.updatedAt! > a.updatedAt! ? 1 : -1)).slice(0, 5);

  const pending = db.bookings.filter((b) => b.status === 'pending');
  const newLeads = db.leads.filter((l) => l.status === 'new');
  const pipeline = db.bookings.filter((b) => b.status === 'pending' || b.status === 'confirmed').reduce((s, b) => s + (b.total ?? 0), 0);
  const paid = db.bookings.filter((b) => b.status === 'paid').reduce((s, b) => s + (b.total ?? 0), 0);
  const stats = [
    { n: pending.length, l: 'Bookings to confirm', href: '/admin/bookings?status=pending' },
    { n: newLeads.length, l: 'New leads', href: '/admin/leads?status=active' },
    { n: '₹' + pipeline.toLocaleString('en-IN'), l: 'Open pipeline', href: '/admin/bookings' },
    { n: '₹' + paid.toLocaleString('en-IN'), l: 'Paid bookings', href: '/admin/bookings?status=paid' },
    { n: live.length, l: 'Live places', href: '/admin/destinations' },
    { n: drafts.length, l: 'Draft places', href: '/admin/destinations?status=draft' },
    { n: db.departures.length, l: 'Group trips', href: '/admin/trips' },
    { n: db.stays.length, l: 'Stays', href: '/admin/stays' },
  ];

  return (
    <>
      <AdminHeader
        title="Overview"
        sub="Everything you change here goes live on the site immediately."
        action={<Link href="/admin/destinations/new" className="btn">Add a place</Link>}
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.l} href={s.href} className="card card-hover p-6">
            <p className="text-4xl font-semibold tracking-tightest">{s.n}</p>
            <p className="mt-1 text-sm text-mute">{s.l}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-lg font-semibold">Needs a photo <span className="font-normal text-faint">({noPhoto.length})</span></h2>
          <p className="text-sm text-mute">Places still showing the gradient placeholder.</p>
          <ul className="mt-4 divide-y divide-line/70">
            {noPhoto.slice(0, 8).map((d) => (
              <li key={d.slug} className="flex items-center justify-between py-2.5 text-[15px]">
                {d.name}
                <Link href={`/admin/destinations/${d.slug}#photo`} className="text-sm text-blue-link hover:underline">Upload</Link>
              </li>
            ))}
            {noPhoto.length === 0 && <li className="py-2.5 text-mute">All places have photos. 🎉</li>}
          </ul>
        </section>
        <section className="card p-6">
          <h2 className="text-lg font-semibold">Peaking in {monthLabel(m)} <span className="font-normal text-faint">({peaking.length})</span></h2>
          <p className="text-sm text-mute">Good candidates to feature on the home page.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {peaking.map((d) => <Badge key={d.slug} tone={db.settings.featured.includes(d.slug) ? 'green' : 'gray'}>{d.name}</Badge>)}
          </div>
          <Link href="/admin/settings#featured" className="link-arrow mt-4 text-sm">Edit featured places</Link>
        </section>
      </div>

      {recent.length > 0 && (
        <section className="card mt-6 p-6">
          <h2 className="text-lg font-semibold">Recently edited</h2>
          <ul className="mt-3 divide-y divide-line/70">
            {recent.map((d) => (
              <li key={d.slug} className="flex items-center justify-between py-2.5 text-[15px]">
                <Link href={`/admin/destinations/${d.slug}`} className="hover:text-blue-link">{d.name}</Link>
                <span className="text-xs text-faint">{new Date(d.updatedAt!).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
