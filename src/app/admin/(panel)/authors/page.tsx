import Link from 'next/link';
import { AdminHeader, Area, Field, Flash, Select, Text } from '@/components/admin/ui';
import { AuthorAvatar } from '@/components/AuthorAvatar';
import { getAuthors } from '@/lib/authors';
import { notesByAuthor } from '@/lib/notes';
import type { Author } from '@/lib/types';
import { deleteAuthor, saveAuthor } from '../../actions';

function AuthorForm({ a }: { a?: Author }) {
  return (
    <form action={saveAuthor} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="originalSlug" value={a?.slug ?? ''} />
      <Field label="Name"><Text name="name" defaultValue={a?.name} required placeholder="Beyond Explored Team / your name" /></Field>
      <Field label="Shown as" hint="Person for one human; Organization for a team byline.">
        <Select name="kind" defaultValue={a?.kind ?? 'Person'}><option value="Person">Person</option><option value="Organization">Team / organisation</option></Select>
      </Field>
      {!a && <Field label="URL" hint="Leave blank to use the name. Can’t change later."><Text name="slug" placeholder="neeraj-khichi" /></Field>}
      <Field label="Role / title"><Text name="role" defaultValue={a?.role} placeholder="Travel writer & trip planner" /></Field>
      <Field label="Writing since" hint="Year"><Text name="since" defaultValue={a?.since} placeholder="2026" /></Field>
      <Field label="Bio" hint="2–3 short paragraphs (blank line between). Who you are, how you travel, why trust you." className="sm:col-span-2">
        <Area name="bio" defaultValue={a?.bio} rows={6} required />
      </Field>
      <Field label="Knows about" hint="One per line — shown as topics and in schema (knowsAbout)."><Area name="expertise" defaultValue={a?.expertise.join('\n')} /></Field>
      <Field label="Been there" hint="Places visited first-hand, one per line."><Area name="regions" defaultValue={a?.regions.join('\n')} /></Field>
      <Field label="How we write" hint="Editorial standards, one per line. “Heading: detail” bolds the heading." className="sm:col-span-2">
        <Area name="standards" defaultValue={a?.standards} rows={5} />
      </Field>
      <Field label="Profile links" hint="Full https:// links, one per line — Instagram, LinkedIn, YouTube, website. Used as schema sameAs."><Area name="links" defaultValue={a?.links.join('\n')} placeholder="https://www.instagram.com/…" /></Field>
      <div className="space-y-4">
        <Field label="Public email (optional)"><Text name="email" type="email" defaultValue={a?.email} /></Field>
        <Field label="Photo" hint="Square headshot or team photo, JPG/PNG/WebP, under 8 MB.">
          <input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/avif" className="block w-full text-sm" />
        </Field>
        {a?.photo && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="removePhoto" /> Remove current photo</label>}
      </div>
      <div className="sm:col-span-2"><button className="btn btn-sm">{a ? 'Save author' : 'Add author'}</button></div>
    </form>
  );
}

export default async function Authors({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { ok, err } = await searchParams;
  const authors = getAuthors();
  return (
    <>
      <AdminHeader title="Authors" sub="Bylines on field notes. Each author gets a public profile page linked from every article they write (Google E-E-A-T)." />
      <Flash ok={ok} err={err} />
      <div className="space-y-6">
        {authors.map((a) => {
          const count = notesByAuthor(a.slug).length;
          return (
            <section key={a.slug} className="card p-6">
              <div className="mb-5 flex items-center gap-4">
                <AuthorAvatar a={a} size={56} />
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold">{a.name}</p>
                  <p className="text-sm text-mute">{count} article{count === 1 ? '' : 's'} · <Link href={`/authors/${a.slug}`} target="_blank" className="text-blue-link hover:underline">/authors/{a.slug} ↗</Link></p>
                </div>
              </div>
              <AuthorForm a={a} />
              <form action={deleteAuthor} className="mt-4 flex items-center justify-end gap-3 border-t border-line/70 pt-4 text-xs text-mute">
                <input type="hidden" name="slug" value={a.slug} />
                <label className="flex items-center gap-1.5"><input type="checkbox" name="confirm" className="accent-[#d70015]" /> confirm</label>
                <button className="text-[#d70015] hover:underline">Delete author</button>
              </form>
            </section>
          );
        })}
      </div>
      <section className="card mt-8 p-6">
        <h2 className="mb-4 text-lg font-semibold">Add an author</h2>
        <AuthorForm />
      </section>
    </>
  );
}
