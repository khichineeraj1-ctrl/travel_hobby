import { NextResponse } from 'next/server';
import { currentAccount } from '@/lib/contrib';
import { isAdmin } from '@/lib/auth';
import { rateLimited } from '@/lib/booking';
import { savePhoto } from '@/lib/photos';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const acc = await currentAccount();
  const admin = await isAdmin();
  if (!acc && !admin) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  if (acc && rateLimited(`upload:${acc.id}`, 120, 60 * 60 * 1000)) return NextResponse.json({ error: 'Too many uploads — try again in a bit.' }, { status: 429 });
  const fd = await req.formData();
  const f = fd.get('file');
  const kind = fd.get('kind') === 'cover' ? 'cover' : fd.get('kind') === 'avatar' ? 'avatar' : 'photo';
  if (!(f instanceof File)) return NextResponse.json({ error: 'No file.' }, { status: 400 });
  try {
    return NextResponse.json(await savePhoto(f, kind));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
