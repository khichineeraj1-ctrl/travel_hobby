import { NextResponse } from 'next/server';
import { abs } from '@/lib/seo';
import { endContribSession } from '@/lib/contrib';

export async function POST() {
  await endContribSession();
  return NextResponse.redirect(abs('/contribute'), 303);
}
