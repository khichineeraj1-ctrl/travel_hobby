import type { Metadata } from 'next';
import Link from 'next/link';
import { readDb } from '@/lib/db';
import { googleConfigured } from '@/lib/contrib';
import { GoogleButton } from '@/components/GoogleButton';

export const metadata: Metadata = { title: 'You’re invited to write', robots: { index: false, follow: false } };

export default async function Join({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = (readDb().invites ?? []).find((i) => i.token === token);
  const valid = inv && !inv.usedBy && new Date(inv.expiresAt) > new Date();
  return (
    <div className="wrap max-w-xl py-16 text-center">
      <p className="text-5xl">✍️</p>
      {valid ? (
        <>
          <h1 className="mt-4 text-[36px] font-semibold tracking-tightest">You’re invited to write for Beyond Explored.</h1>
          <p className="mt-3 text-lg text-mute">Sign in with Google to set up your author profile and start your first field note.</p>
          <div className="mt-8">{googleConfigured() ? <GoogleButton href={`/api/auth/google/start?invite=${encodeURIComponent(token)}`} label="Accept with Google" /> : <p className="text-faint">Sign-in opens soon — keep this link.</p>}</div>
          <p className="mt-4 text-sm text-faint">This link works once and expires {new Date(inv!.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}.</p>
        </>
      ) : (
        <>
          <h1 className="mt-4 text-[32px] font-semibold tracking-tightest">This invite link has expired or was already used.</h1>
          <p className="mt-3 text-mute">Ask us for a new one, or <Link href="/contribute" className="text-blue-link underline">apply to write</Link>.</p>
        </>
      )}
    </div>
  );
}
