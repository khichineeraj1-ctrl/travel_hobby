import { Breadcrumbs } from './Breadcrumbs';
import { guide, guideQuiet } from '@/lib/guide';

export function BookShell({ crumbs, title, sub, children, aside }: { crumbs: { name: string; path: string }[]; title: string; sub?: string; children: React.ReactNode; aside: React.ReactNode }) {
  return (
    <div className="wrap pt-6" {...guideQuiet}>
      <Breadcrumbs items={crumbs} />
      <h1 className="mt-8 text-[36px] font-semibold leading-tight tracking-tightest sm:text-[48px]">{title}</h1>
      {sub && <p className="mt-2 text-xl text-mute">{sub}</p>}
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="card p-6 sm:p-8">{children}</div>
        <aside className="space-y-5 lg:sticky lg:top-16 lg:self-start">{aside}</aside>
      </div>
    </div>
  );
}

export function TrustCard() {
  return (
    <div className="card p-6 text-[15px]">
      <p className="font-semibold">How it works</p>
      <ol className="mt-3 space-y-2 text-mute">
        <li><b className="text-ink">1.</b> Reserve — nothing to pay today.</li>
        <li><b className="text-ink">2.</b> We confirm on WhatsApp within 24 hours.</li>
        <li><b className="text-ink">3.</b> Pay via the secure link to lock it in.</li>
      </ol>
    </div>
  );
}
