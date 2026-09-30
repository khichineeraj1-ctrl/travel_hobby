import { redirect } from 'next/navigation';
import { login } from '../actions';
import { Wordmark } from '@/components/Wordmark';
import { DEV_PASSWORD, isAdmin, usingDevPassword } from '@/lib/auth';

export default async function Login({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  if (await isAdmin()) redirect('/admin');
  const { err } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <form action={login} className="card w-full max-w-sm p-10 text-center">
        <p className="text-[28px]"><Wordmark /></p>
        <p className="mt-1 text-mute">Sign in to manage the site.</p>
        <input
          type="password"
          name="password"
          required
          autoFocus
          placeholder="Admin password"
          autoComplete="current-password"
          className="field mt-8 text-center"
          aria-label="Admin password"
        />
        {err && <p className="mt-3 text-sm text-[#d70015]">That password didn’t work.</p>}
        <button className="btn mt-5 w-full">Sign in</button>
        {usingDevPassword() && (
          <p className="mt-6 rounded-xl bg-[#fff4e5] p-3 text-left text-xs text-eyebrow">
            Dev mode: no <code>ADMIN_PASSWORD</code> set in <code>.env.local</code>, so the password is <b>{DEV_PASSWORD}</b>. Set your own before going live.
          </p>
        )}
      </form>
    </div>
  );
}
