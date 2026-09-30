'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/** Something broke — still give them a way forward, never a blank screen. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="wrap-narrow py-28 text-center">
      <p className="kicker">Wrong turn</p>
      <h1 className="mt-2 text-5xl font-semibold tracking-tightest">That didn’t load. Our bad.</h1>
      <p className="mt-4 text-xl text-mute">Try again — or keep exploring while we fix it.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button onClick={reset} className="btn">Try again</button>
        <Link href="/places" className="btn-secondary">Explore places</Link>
        <Link href="/roll" prefetch={false} className="btn-secondary">🎲 Surprise me</Link>
        <Link href="/book/custom" className="btn-secondary">Ask a human</Link>
      </div>
    </div>
  );
}
