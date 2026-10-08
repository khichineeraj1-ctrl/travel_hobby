import Link from 'next/link';
import { requireAccount } from '@/lib/contrib';
import { authorBySlug } from '@/lib/authors';
import { AvatarUpload } from '@/components/studio/AvatarUpload';
import { saveMyProfile } from '../actions';

const F = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label className="block"><span className="mb-1.5 block text-sm font-medium">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}</label>
);

export default async function Profile({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const acc = await requireAccount();
  const a = authorBySlug(acc.authorSlug);
  if (!a) return <p>Profile not found — contact the editor.</p>;
  return (
    <div className="max-w-3xl">
      <h1 className="text-[36px] font-semibold tracking-tightest">Your author profile</h1>
      <p className="mt-1 text-mute">This is your public page at <Link href={`/authors/${a.slug}`} target="_blank" className="text-blue-link hover:underline">/authors/{a.slug} ↗</Link>, linked from every note you write. It’s how readers and Google decide to trust you.</p>
      {ok && <p className="mt-4 rounded-2xl bg-[#e3f9e5] px-5 py-3 text-[#1a7f37]">Saved.</p>}
      <form action={saveMyProfile} className="card mt-6 space-y-5 p-6">
        <F label="Photo" hint="A clear photo of you. Square works best."><AvatarUpload name="photo" initial={a.photo} /></F>
        <div className="grid gap-4 sm:grid-cols-2">
          <F label="Name"><input name="name" defaultValue={a.name} className="field" required /></F>
          <F label="Tagline" hint="e.g. Weekend trekker from Pune"><input name="role" defaultValue={a.role} className="field" /></F>
        </div>
        <F label="Bio" hint="2–3 short paragraphs: who you are, how you travel, what you know well. Blank line = new paragraph. At least a couple of sentences.">
          <textarea name="bio" rows={6} defaultValue={a.bio} className="field leading-relaxed" required minLength={80} />
        </F>
        <div className="grid gap-4 sm:grid-cols-2">
          <F label="Knows about" hint="One per line — e.g. Himalayan treks"><textarea name="expertise" rows={4} defaultValue={a.expertise.join('\n')} className="field" /></F>
          <F label="Places you’ve been" hint="One per line"><textarea name="regions" rows={4} defaultValue={a.regions.join('\n')} className="field" /></F>
        </div>
        <F label="Your profiles" hint="Full https:// links, one per line — Instagram, LinkedIn, YouTube, blog."><textarea name="links" rows={3} defaultValue={a.links.join('\n')} className="field" placeholder="https://www.instagram.com/…" /></F>
        <button className="btn">Save profile</button>
      </form>
    </div>
  );
}
