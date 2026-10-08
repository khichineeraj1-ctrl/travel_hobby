'use client';

import { useActionState } from 'react';
import { applyToWrite, type ApplyState } from '@/app/actions/contribute';

export function ApplyForm() {
  const [st, action, pending] = useActionState<ApplyState, FormData>(applyToWrite, {});
  const e = st.errors ?? {};
  if (st.ok) return <div className="card p-8 text-center" role="status"><p className="text-3xl">✓</p><p className="mt-2 text-lg font-semibold">{st.message}</p></div>;
  const F = ({ name, label, hint, children }: { name: string; label: string; hint?: string; children: React.ReactNode }) => (
    <label className="block"><span className="mb-1.5 block text-sm font-medium">{label}</span>{children}{e[name] ? <span className="mt-1 block text-xs text-[#d70015]">{e[name]}</span> : hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}</label>
  );
  return (
    <form action={action} className="card space-y-4 p-6">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {st.message && !st.ok && <p className="text-sm text-[#d70015]">{st.message}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <F name="name" label="Your name"><input name="name" className="field" autoComplete="name" /></F>
        <F name="email" label="Google email" hint="You’ll sign in with this."><input name="email" type="email" className="field" autoComplete="email" /></F>
      </div>
      <F name="places" label="Places you’ve been recently" hint="The offbeat ones especially."><textarea name="places" rows={3} className="field" /></F>
      <F name="pitch" label="What would you write about?" hint="One or two trips you could write up, and the angle — the thing most people get wrong."><textarea name="pitch" rows={4} className="field" /></F>
      <div className="grid gap-4 sm:grid-cols-2">
        <F name="sample" label="Your Instagram / blog (optional)"><input name="sample" className="field" placeholder="https://…" /></F>
        <F name="phone" label="WhatsApp (optional)"><input name="phone" className="field" inputMode="tel" /></F>
      </div>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 accent-[#0071e3]" /> <span>Contact me about writing for Beyond Explored.{e.consent && <span className="block text-xs text-[#d70015]">{e.consent}</span>}</span></label>
      <button disabled={pending} className="btn">{pending ? 'Sending…' : 'Apply to write'}</button>
    </form>
  );
}
