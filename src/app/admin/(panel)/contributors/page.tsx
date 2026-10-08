import Link from 'next/link';
import { AdminHeader, Flash, Text, ago } from '@/components/admin/ui';
import { readDb } from '@/lib/db';
import { abs } from '@/lib/seo';
import { googleConfigured } from '@/lib/contrib';
import { createInvite, revokeInvite, setAccountStatus, setApplication } from '../../actions';

export default async function Contributors({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { ok, err } = await searchParams;
  const db = readDb();
  const invites = db.invites ?? [];
  const apps = [...(db.applications ?? [])].sort((a, b) => (a.status === 'new' ? -1 : 1) - (b.status === 'new' ? -1 : 1) || b.createdAt.localeCompare(a.createdAt));
  const accounts = db.accounts ?? [];
  const noteCount = (id: string) => (db.notes ?? []).filter((n) => n.accountId === id).length;
  return (
    <>
      <AdminHeader title="Contributors" sub="Writers sign in with Google. They can join with an invite link or after you approve their application. Everything they write comes to Field notes for your review." />
      <Flash ok={ok} err={err} />
      {!googleConfigured() && (
        <div className="card mb-6 border-l-4 border-[#f5a623] p-5 text-[15px]">
          <b>Google sign-in isn’t switched on yet.</b> Add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in Railway → Variables. Authorised redirect URI: <code>{abs('/api/auth/google/callback')}</code>
        </div>
      )}

      <section className="card p-6">
        <h2 className="text-lg font-semibold">Invite a writer</h2>
        <form action={createInvite} className="mt-3 flex flex-wrap items-center gap-3">
          <Text name="note" placeholder="Who it’s for (e.g. Riya — Spiti trip)" className="min-w-[240px] flex-1" />
          <Text name="days" type="number" defaultValue={14} min={1} max={60} className="!w-24" aria-label="Valid for days" />
          <span className="text-sm text-mute">days</span>
          <button className="btn btn-sm">Create invite link</button>
        </form>
        {invites.length > 0 && (
          <div className="mt-5 divide-y divide-line/70 text-sm">
            {invites.map((i) => {
              const used = !!i.usedBy, expired = new Date(i.expiresAt) < new Date();
              return (
                <div key={i.token} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="min-w-0 flex-1">
                    <b>{i.note || 'Invite'}</b> <span className="text-mute">· {used ? `used ${ago(i.usedAt!)}` : expired ? 'expired' : `expires ${new Date(i.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}</span>
                    {!used && !expired && <input readOnly value={abs(`/contribute/join/${i.token}`)} className="field mt-1 !py-1.5 font-mono text-xs" />}
                  </span>
                  {!used && <form action={revokeInvite}><input type="hidden" name="token" value={i.token} /><button className="text-[#d70015] hover:underline">Revoke</button></form>}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card mt-6 p-6">
        <h2 className="text-lg font-semibold">Applications <span className="text-mute">({apps.filter((a) => a.status === 'new').length} new)</span></h2>
        {apps.length === 0 ? <p className="mt-2 text-sm text-mute">None yet. The form is at <Link href="/contribute" target="_blank" className="text-blue-link">/contribute</Link>.</p> : (
          <div className="mt-3 divide-y divide-line/70">
            {apps.map((a) => (
              <div key={a.id} className="py-4 text-[15px]">
                <div className="flex flex-wrap items-center gap-3">
                  <b>{a.name}</b><span className="text-mute">{a.email}{a.phone ? ` · ${a.phone}` : ''} · {ago(a.createdAt)}</span>
                  <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${a.status === 'new' ? 'bg-blue-soft text-blue-link' : a.status === 'approved' ? 'bg-[#e3f9e5] text-[#1a7f37]' : 'bg-paper text-mute'}`}>{a.status}</span>
                </div>
                <p className="mt-2 text-sm"><span className="text-mute">Been to:</span> {a.places}</p>
                <p className="mt-1 text-sm"><span className="text-mute">Would write:</span> {a.pitch}</p>
                {a.sample && <a href={a.sample} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-blue-link">{a.sample} ↗</a>}
                {a.status === 'new' && (
                  <div className="mt-3 flex gap-3">
                    <form action={setApplication}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="approved" /><button className="btn btn-sm">Approve</button></form>
                    <form action={setApplication}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="rejected" /><button className="btn-secondary btn-sm">Decline</button></form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card mt-6 p-6">
        <h2 className="text-lg font-semibold">Writers</h2>
        {accounts.length === 0 ? <p className="mt-2 text-sm text-mute">No writers yet.</p> : (
          <div className="mt-3 divide-y divide-line/70 text-[15px]">
            {accounts.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-3 py-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {a.picture ? <img src={a.picture} alt="" className="h-9 w-9 rounded-full" referrerPolicy="no-referrer" /> : <span className="h-9 w-9 rounded-full bg-paper" />}
                <span className="min-w-0 flex-1"><b>{a.name}</b> <span className="text-mute">· {a.email} · {noteCount(a.id)} notes · joined via {a.via}{a.lastLogin ? ` · last in ${ago(a.lastLogin)}` : ''}</span></span>
                <Link href={`/authors/${a.authorSlug}`} target="_blank" className="text-sm text-blue-link">Profile ↗</Link>
                <form action={setAccountStatus}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value={a.status === 'active' ? 'suspended' : 'active'} />
                  <button className={`text-sm hover:underline ${a.status === 'active' ? 'text-[#d70015]' : 'text-[#1a7f37]'}`}>{a.status === 'active' ? 'Pause' : 'Re-activate'}</button></form>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
