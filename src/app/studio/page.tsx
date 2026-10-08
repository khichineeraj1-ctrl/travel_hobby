import Link from 'next/link';
import { requireAccount } from '@/lib/contrib';
import { readDb } from '@/lib/db';
import { authorBySlug } from '@/lib/authors';
import { createNote } from './actions';

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-paper text-mute' },
  pending: { label: 'In review', cls: 'bg-blue-soft text-blue-link' },
  changes: { label: 'Changes requested', cls: 'bg-[#fff4e5] text-[#9a4b00]' },
  published: { label: 'Live', cls: 'bg-[#e3f9e5] text-[#1a7f37]' },
};

export default async function Studio() {
  const acc = await requireAccount();
  const notes = (readDb().notes ?? []).filter((n) => n.accountId === acc.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const author = authorBySlug(acc.authorSlug);
  const bioOk = (author?.bio ?? '').length >= 80;
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Hi {acc.name.split(' ')[0]} 👋</p>
          <h1 className="mt-1 text-[36px] font-semibold tracking-tightest">Your field notes</h1>
        </div>
        <form action={createNote}><button className="btn">+ New field note</button></form>
      </div>

      {!bioOk && (
        <Link href="/studio/profile" className="card card-hover mt-6 block p-5 text-[15px]">
          <b>First, finish your author profile ›</b>
          <span className="mt-1 block text-mute">Readers (and Google) trust notes more when they can see who wrote them. Add a photo and a short bio — you’ll need it before you can submit.</span>
        </Link>
      )}

      <div className="mt-8 space-y-3">
        {notes.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-xl font-semibold">Where did you go last?</p>
            <p className="mt-1 text-mute">Write it up while it’s fresh — the gate that was shut, the dinner that was worth it, the thing you’d do differently.</p>
          </div>
        )}
        {notes.map((n) => (
          <Link key={n.id} href={`/studio/notes/${n.id}`} className="card card-hover flex items-center gap-4 p-5">
            {n.cover
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={n.cover.src} alt="" className="h-16 w-24 shrink-0 rounded-xl object-cover" />
              : <span className="grid h-16 w-24 shrink-0 place-items-center rounded-xl bg-paper text-2xl">📝</span>}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[17px] font-semibold">{n.title || 'Untitled note'}</span>
              <span className="block text-sm text-mute">{n.place || 'No place yet'} · edited {new Date(n.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            </span>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS[n.status].cls}`}>{STATUS[n.status].label}</span>
          </Link>
        ))}
      </div>

      <div className="card mt-10 p-6 text-[15px]">
        <p className="font-semibold">How it works</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-mute">
          <li>Tell us about your trip and add photos — “Draft it for me” writes a first draft in our house style, using only what you told it.</li>
          <li>Check it, fill any gaps it flags, and polish — the checklist shows what a great field note needs.</li>
          <li>Submit for review. Our editor reads every note before it goes live.</li>
          <li>We publish it with your byline linking to your author page — or send it back with notes.</li>
        </ol>
      </div>
    </>
  );
}
