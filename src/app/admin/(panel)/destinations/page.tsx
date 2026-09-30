import Link from 'next/link';
import { readDb } from '@/lib/db';
import { AdminHeader, Badge, Flash } from '@/components/admin/ui';
import { PlaceArt } from '@/components/PlaceCard';
import { togglePublished } from '../../actions';

export default async function Destinations({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; ok?: string; err?: string }> }) {
  const { q = '', status = 'all', ok, err } = await searchParams;
  const all = readDb().destinations;
  const needle = q.toLowerCase();
  const items = all
    .filter((d) => !needle || `${d.name} ${d.state}`.toLowerCase().includes(needle))
    .filter((d) => status === 'all' || (status === 'draft' ? d.published === false : d.published !== false))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <AdminHeader title="Places" sub={`${all.length} total`} action={<Link href="/admin/destinations/new" className="btn">Add a place</Link>} />
      <Flash ok={ok} err={err} />
      <form className="mb-5 flex flex-wrap gap-3">
        <input name="q" defaultValue={q} placeholder="Search by name or state" className="field max-w-xs" />
        <select name="status" defaultValue={status} className="field w-auto">
          <option value="all">All</option>
          <option value="live">Live</option>
          <option value="draft">Drafts</option>
        </select>
        <button className="btn-secondary !py-2 !text-[15px]">Filter</button>
      </form>
      <div className="card overflow-hidden">
        <table className="w-full text-left text-[15px]">
          <thead className="border-b border-line text-xs font-semibold uppercase tracking-wide text-faint">
            <tr>
              <th className="px-5 py-3">Place</th>
              <th className="hidden px-5 py-3 md:table-cell">Crowd</th>
              <th className="hidden px-5 py-3 md:table-cell">Photo</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((d) => (
              <tr key={d.slug} className="border-b border-line/60 last:border-0 hover:bg-paper/60">
                <td className="px-5 py-3">
                  <Link href={`/admin/destinations/${d.slug}`} className="flex items-center gap-3">
                    <PlaceArt d={d} className="h-11 w-16 shrink-0 rounded-lg" />
                    <span>
                      <span className="block font-medium">{d.name}</span>
                      <span className="block text-xs text-faint">{d.state} · /places/{d.slug}</span>
                    </span>
                  </Link>
                </td>
                <td className="hidden px-5 py-3 md:table-cell">{d.crowd}/5</td>
                <td className="hidden px-5 py-3 md:table-cell">{d.image ? <Badge tone="green">Photo</Badge> : <Badge tone="orange">Missing</Badge>}</td>
                <td className="px-5 py-3">
                  <form action={togglePublished}>
                    <input type="hidden" name="slug" value={d.slug} />
                    <button title="Click to toggle">{d.published === false ? <Badge tone="gray">Draft</Badge> : <Badge tone="green">Live</Badge>}</button>
                  </form>
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right text-sm">
                  <Link href={`/admin/destinations/${d.slug}`} className="text-blue-link hover:underline">Edit</Link>
                  {d.published !== false && <Link href={`/places/${d.slug}`} target="_blank" className="ml-4 text-mute hover:text-ink">View ↗</Link>}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-mute">No places match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
