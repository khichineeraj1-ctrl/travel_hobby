import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { readDb } from '@/lib/db';
import { currentAccount } from '@/lib/contrib';
import { isAdmin } from '@/lib/auth';
import { INDIA_STATES } from '@/lib/gems';
import { NoteEditor } from '@/components/studio/NoteEditor';
import { deleteDraft } from '../../actions';

export default async function EditNote({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await isAdmin();
  const acc = await currentAccount();
  if (!acc && !admin) redirect('/contribute?err=signin');
  const db = readDb();
  const note = (db.notes ?? []).find((n) => n.id === id);
  if (!note || (!admin && note.accountId !== acc?.id)) notFound();
  const author = (db.authors ?? []).find((a) => a.slug === note.authorSlug);
  const locked = note.status === 'pending' || note.status === 'published';
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={admin && !acc ? '/admin/notes' : '/studio'} className="text-sm text-blue-link hover:underline">‹ Back</Link>
        {(admin || note.status === 'draft' || note.status === 'changes') && (
          <form action={deleteDraft}><input type="hidden" name="id" value={note.id} /><button className="text-sm text-mute hover:text-[#d70015]">Delete note</button></form>
        )}
      </div>
      <NoteEditor initial={note} states={INDIA_STATES.map((s) => ({ slug: s.slug, name: s.name }))} bioOk={(author?.bio ?? '').length >= 80} admin={admin} locked={locked} />
    </>
  );
}
