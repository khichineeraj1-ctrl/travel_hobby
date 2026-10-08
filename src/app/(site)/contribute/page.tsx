import Link from 'next/link';
import { PageHead } from '@/components/Listing';
import { ApplyForm } from '@/components/ApplyForm';
import { currentAccount, googleConfigured } from '@/lib/contrib';
import { meta } from '@/lib/seo';
import { GoogleButton } from '@/components/GoogleButton';

export const metadata = meta({
  title: 'Write for Beyond Explored',
  description: 'Been somewhere offbeat in India? Write a field note for Beyond Explored — your trip, your photos, your byline. Apply or sign in with Google.',
  path: '/contribute',
});

const ERR: Record<string, string> = {
  'not-invited': 'That Google account isn’t on our writer list yet. Apply below, or ask us for an invite link.',
  'invite-used': 'That invite link has already been used or has expired. Ask us for a new one.',
  suspended: 'This writer account is paused. Get in touch with us.',
  expired: 'The sign-in took too long — please try again.',
  cancelled: 'Sign-in was cancelled.',
  google: 'Google sign-in didn’t work — please try again.',
  signin: 'Please sign in to continue.',
  'google-off': 'Writer sign-in isn’t switched on yet — check back soon.',
};


export default async function Contribute({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const { err } = await searchParams;
  const acc = await currentAccount();
  return (
    <div className="wrap">
      <PageHead crumbs={[{ name: 'Write for us', path: '/contribute' }]} kicker="Write for us" h1="Been somewhere worth writing about?" intro="We publish field notes from real trips — the gate that was shut, the dinner worth the drive, the thing you’d do differently. Your photos, your byline, your author page." />
      {err && ERR[err] && <p className="mt-6 rounded-2xl bg-[#fff4e5] px-5 py-3 text-[15px] text-[#9a4b00]">{ERR[err]}</p>}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-10">
          <section>
            <h2 className="text-2xl font-semibold tracking-headline">What we’re looking for</h2>
            <ul className="mt-4 space-y-3 text-[17px]">
              <li>✅ <b>First-hand only.</b> Places you’ve actually been, and when.</li>
              <li>✅ <b>Your own photos.</b> No stock, no children’s faces, no number plates.</li>
              <li>✅ <b>Useful over pretty.</b> Opening dates, how to book, what it cost, the catch.</li>
              <li>✅ <b>Answers people search for.</b> “Where should I stay…?”, “Which zone…?” — our editor helps.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-2xl font-semibold tracking-headline">How it works</h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-[17px]">
              <li>Apply below (or use the invite link we sent you).</li>
              <li>Sign in with Google and set up your author profile.</li>
              <li>Write in the studio — a checklist shows what a great note needs.</li>
              <li>Our editor reviews it and publishes it under your name.</li>
            </ol>
          </section>
          <section id="apply">
            <h2 className="text-2xl font-semibold tracking-headline">Apply to write</h2>
            <div className="mt-4"><ApplyForm /></div>
          </section>
        </div>
        <aside className="space-y-5 lg:sticky lg:top-16 lg:self-start">
          <div className="card p-6">
            <p className="text-lg font-semibold">{acc ? `Welcome back, ${acc.name.split(' ')[0]}` : 'Already a writer?'}</p>
            <p className="mt-1 text-[15px] text-mute">{acc ? 'Pick up where you left off.' : 'Sign in with the Google account you applied or were invited with.'}</p>
            <div className="mt-4">{acc ? <Link href="/studio" className="btn">Open my studio</Link> : googleConfigured() ? <GoogleButton href="/api/auth/google/start" /> : <p className="text-sm text-faint">Sign-in opens soon.</p>}</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
