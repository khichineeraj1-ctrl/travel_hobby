import Link from 'next/link';

/** 404 inside the site (unknown place/event/…): the (site) layout already adds nav, take-away picks, footer and guide. */
export default function NotFound() {
  return (
    <div className="wrap-narrow py-28 text-center">
      <p className="kicker">404</p>
      <h1 className="mt-2 text-5xl font-semibold tracking-tightest">You got a little too lost.</h1>
      <p className="mt-4 text-xl text-mute">That page doesn’t exist (anymore). Plenty of places do.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/places" className="btn">Explore places</Link>
        <Link href="/roll" className="btn-secondary" prefetch={false}>🎲 Surprise me</Link>
      </div>
    </div>
  );
}
