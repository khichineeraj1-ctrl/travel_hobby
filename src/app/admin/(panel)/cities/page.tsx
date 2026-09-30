import { readDb } from '@/lib/db';
import { AdminHeader, Check, Flash, Text } from '@/components/admin/ui';
import { deleteCity, saveCity } from '../../actions';

export default async function Cities({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { ok, err } = await searchParams;
  const { cities } = readDb();
  return (
    <>
      <AdminHeader title="Starting cities" sub="Where travellers leave from. Each city gets a /from/<city> page and appears in the planner." />
      <Flash ok={ok} err={err} />
      <div className="card divide-y divide-line/70">
        <div className="hidden grid-cols-[1.4fr_1fr_1fr_110px_150px] gap-3 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-faint md:grid">
          <span>City</span><span>Latitude</span><span>Longitude</span><span>Airport</span><span />
        </div>
        {cities.map((c) => (
          <div key={c.slug} className="px-6 py-4">
            <form action={saveCity} className="grid items-center gap-3 md:grid-cols-[1.4fr_1fr_1fr_110px_150px]">
              <input type="hidden" name="originalSlug" value={c.slug} />
              <Text name="name" defaultValue={c.name} aria-label="City name" />
              <Text type="number" step="any" name="lat" defaultValue={c.lat} aria-label="Latitude" />
              <Text type="number" step="any" name="lng" defaultValue={c.lng} aria-label="Longitude" />
              <Check name="hasAirport" label="Airport" defaultChecked={c.hasAirport} />
              <div className="flex items-center justify-end gap-3">
                <button className="text-sm text-blue-link hover:underline">Save</button>
              </div>
            </form>
            <form action={deleteCity} className="mt-2 flex items-center justify-end gap-3 text-xs text-mute">
              <input type="hidden" name="slug" value={c.slug} />
              <span className="mr-auto">/from/{c.slug}</span>
              <label className="flex items-center gap-1.5"><input type="checkbox" name="confirm" className="accent-[#d70015]" /> confirm</label>
              <button className="text-[#d70015] hover:underline">Remove</button>
            </form>
          </div>
        ))}
      </div>
      <section className="card mt-8 p-6">
        <h2 className="mb-1 text-lg font-semibold">Add a city</h2>
        <p className="mb-4 text-sm text-mute">Tip: right-click the city on Google Maps to copy its coordinates.</p>
        <form action={saveCity} className="grid items-center gap-3 md:grid-cols-[1.4fr_1fr_1fr_110px_auto]">
          <input type="hidden" name="originalSlug" value="" />
          <Text name="name" placeholder="City name" required />
          <Text type="number" step="any" name="lat" placeholder="Latitude" required />
          <Text type="number" step="any" name="lng" placeholder="Longitude" required />
          <Check name="hasAirport" label="Airport" defaultChecked />
          <button className="btn btn-sm">Add city</button>
        </form>
      </section>
    </>
  );
}
