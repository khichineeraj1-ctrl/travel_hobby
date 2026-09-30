import { readDb } from '@/lib/db';
import { AdminHeader, Area, DangerZone, Field, Flash, Text } from '@/components/admin/ui';
import { PhotoInput } from '@/components/admin/PhotoInput';
import { deleteVibe, moveVibe, saveVibe } from '../../actions';
import type { Vibe } from '@/lib/types';

function VibeForm({ v }: { v?: Vibe }) {
  return (
    <form action={saveVibe} className="space-y-4">
      <input type="hidden" name="originalId" value={v?.id ?? ''} />
      <div className="grid gap-4 sm:grid-cols-[90px_1fr_1fr]">
        <Field label="Emoji"><Text name="emoji" defaultValue={v?.emoji} maxLength={4} className="text-center text-2xl" placeholder="✨" /></Field>
        <Field label="Name"><Text name="label" defaultValue={v?.label} required placeholder="Touch grass" /></Field>
        <Field label="Page title (SEO)"><Text name="seoTitle" defaultValue={v?.seoTitle} placeholder="Offbeat Nature Escapes in India" /></Field>
      </div>
      <Field label="Description"><Area name="blurb" rows={2} defaultValue={v?.blurb} /></Field>
      {!v && <Field label="URL id" hint="Optional. Becomes /vibe/<id>. Generated from the name if empty."><Text name="id" placeholder="auto" /></Field>}
      <details>
        <summary className="cursor-pointer text-sm text-blue-link">Icon image (optional — replaces the emoji)</summary>
        <div className="mt-4"><PhotoInput current={v?.image} aspect="aspect-square max-w-[140px]" /></div>
      </details>
      <button className="btn btn-sm">{v ? 'Save' : 'Add vibe'}</button>
    </form>
  );
}

export default async function Vibes({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { ok, err } = await searchParams;
  const db = readDb();
  return (
    <>
      <AdminHeader title="Vibes" sub="The categories in the home page rail and on /vibe pages. Order here = order on the site." />
      <Flash ok={ok} err={err} />
      <div className="space-y-4">
        {db.vibes.map((v, i) => (
          <details key={v.id} className="card group p-6">
            <summary className="flex cursor-pointer list-none items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-paper text-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {v.image ? <img src={v.image} alt="" className="h-full w-full object-cover" /> : v.emoji}
              </span>
              <span className="flex-1">
                <span className="block font-semibold">{v.label}</span>
                <span className="block text-sm text-mute">/vibe/{v.id} · {db.destinations.filter((d) => d.vibes.includes(v.id)).length} places</span>
              </span>
              <span className="flex gap-1">
                {(['up', 'down'] as const).map((dir) => (
                  <form key={dir} action={moveVibe}>
                    <input type="hidden" name="id" value={v.id} /><input type="hidden" name="dir" value={dir} />
                    <button disabled={(dir === 'up' && i === 0) || (dir === 'down' && i === db.vibes.length - 1)} className="h-8 w-8 rounded-full text-mute hover:bg-paper disabled:opacity-30" aria-label={`Move ${dir}`}>
                      {dir === 'up' ? '↑' : '↓'}
                    </button>
                  </form>
                ))}
              </span>
              <span className="text-sm text-blue-link group-open:hidden">Edit</span>
            </summary>
            <div className="mt-6 border-t border-line pt-6">
              <VibeForm v={v} />
              <div className="mt-6 border-t border-line pt-4"><DangerZone action={deleteVibe} hidden={{ id: v.id }} what={`“${v.label}”`} /></div>
            </div>
          </details>
        ))}
      </div>
      <section className="card mt-8 p-6">
        <h2 className="mb-4 text-lg font-semibold">Add a vibe</h2>
        <VibeForm />
      </section>
    </>
  );
}
