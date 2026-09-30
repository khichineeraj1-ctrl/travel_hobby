import Link from 'next/link';
import { GlobalNav, Footer } from '@/components/Chrome';

export default function NotFound() {
  return (
    <>
      <GlobalNav />
      <div className="wrap-narrow py-32 text-center">
        <p className="kicker">404</p>
        <h1 className="mt-2 text-5xl font-semibold tracking-tightest">You got a little too lost.</h1>
        <p className="mt-4 text-xl text-mute">This page doesn’t exist. Plenty of places do.</p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/" className="btn">Take me home</Link>
          <Link href="/roll" className="btn-secondary" prefetch={false}>Surprise me</Link>
        </div>
      </div>
      <Footer />
    </>
  );
}
