import Link from 'next/link';
import { AdminHeader, Flash, ago } from '@/components/admin/ui';
import { readDb } from '@/lib/db';
import { noteChecklist } from '@/lib/noteRules';
import { NOTES } from '@/data/notes';
import { reviewNote } from '../../actions';

const ORDER = { pending: 0, changes: 1, draft: 2, published: 3 } as const;
const LABEL = { pending: 'Waiting for review', changes: 'Sent back', draft: 'Draft', published: 'Live' } as const;

export default async function Notes({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { ok, err } = await searchParams;
  const db = readDb();
  const notes = [...(db.notes ?? [])].sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.updatedAt.localeCompare(a.updatedAt));
  const authorName = (slug: string) => db.authors?.find((a) => a.slug === slug)?.name ?? slug;
  const bioOk = (slug: string) => (db.authors?.find((a) => a.slug === slug)?.bio ?? '').length >= 80;
  return (
    <>
      <AdminHeader title="Field notes" sub="Notes from writers. Review, edit, send back with comments, or publish. Published notes appear on the site, in search, on the author’s page and in the sitemap." />
      <Flash ok={ok} err={err} />
      <div className="space-y-4">
        {notes.length === 0 && <p className="card p-6 text-mute">No notes from writers yet. Invite someone from Contributors.</p>}
        {notes.map((n) => {
          const checks = noteChecklist(n, bioOk(n.authorSlug));
          const done = checks.filter((c) => c.ok).length;
          return (
            <section key={n.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {n.cover ? <img src={n.cover.src} alt="" className="h-16 w-24 rounded-xl object-cover" /> : <span className="grid h-16 w-24 place-items-center rounded-xl bg-paper">📝</span>}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px] font-semibold">{n.title || 'Untitled'}</p>
                  <p className="text-sm text-mute">{authorName(n.authorSlug)} · {n.place || '—'} · updated {ago(n.updatedAt)} · checklist {done}/{checks.length}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${n.status === 'pending' ? 'bg-blue-soft text-blue-link' : n.status === 'published' ? 'bg-[#e3f9e5] text-[#1a7f37]' : n.status === 'changes' ? 'bg-[#fff4e5] text-[#9a4b00]' : 'bg-paper text-mute'}`}>{LABEL[n.status]}</span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <Link href={`/studio/notes/${n.id}/preview`} target="_blank" className="btn-secondary btn-sm">Preview ↗</Link>
                <Link href={`/studio/notes/${n.id}`} className="btn-secondary btn-sm">Edit</Link>
                {n.status === 'published' && <Link href={`/notes/${n.slug}`} target="_blank" className="text-blue-link">/notes/{n.slug} ↗</Link>}
                {n.status !== 'published' && <form action={reviewNote}><input type="hidden" name="id" value={n.id} /><input type="hidden" name="do" value="publish" /><button className="btn btn-sm">Publish</button></form>}
                {n.status === 'published' && (
                  <>
                    <form action={reviewNote}><input type="hidden" name="id" value={n.id} /><input type="hidden" name="do" value="recheck" /><button className="text-blue-link hover:underline">Mark facts checked today</button></form>
                    <form action={reviewNote}><input type="hidden" name="id" value={n.id} /><input type="hidden" name="do" value="unpublish" /><button className="text-[#d70015] hover:underline">Unpublish</button></form>
                  </>
                )}
              </div>
              {n.status !== 'published' && (
                <form action={reviewNote} className="mt-4 flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={n.id} /><input type="hidden" name="do" value="changes" />
                  <textarea name="comment" rows={2} placeholder="Notes for the writer — what to fix before it can go live" className="field min-w-[260px] flex-1 text-sm" defaultValue={n.status === 'changes' ? n.reviewNote : ''} />
                  <button className="btn-secondary btn-sm self-start">Send back</button>
                </form>
              )}
              {done < checks.length && <p className="mt-3 text-xs text-faint">Missing: {checks.filter((c) => !c.ok).map((c) => c.label).join(' · ')}</p>}
            </section>
          );
        })}
      </div>
      <p className="mt-8 text-sm text-faint">Hand-built notes ({NOTES.length}) live in the code and aren’t listed here.</p>
    </>
  );
}
