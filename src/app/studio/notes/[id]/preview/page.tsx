import { notFound, redirect } from 'next/navigation';
import { readDb } from '@/lib/db';
import { currentAccount } from '@/lib/contrib';
import { isAdmin } from '@/lib/auth';
import { StudioNote } from '@/components/StudioNote';

export default async function Preview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await isAdmin();
  const acc = await currentAccount();
  if (!acc && !admin) redirect('/contribute?err=signin');
  const note = (readDb().notes ?? []).find((n) => n.id === id);
  if (!note || (!admin && note.accountId !== acc?.id)) notFound();
  return (
    <div className="-mx-5 -my-8 bg-white sm:-my-10">
      <StudioNote d={{ ...note, slug: note.slug || 'preview' }} preview={<p className="bg-[#fff4e5] px-5 py-3 text-center text-sm text-[#9a4b00]">Preview — this is how it will look. Not public until the editor publishes it.</p>} />
    </div>
  );
}
