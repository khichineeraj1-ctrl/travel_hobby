import Link from 'next/link';
import { JsonLd } from '@/lib/jsonld';
import { breadcrumbLd } from '@/lib/seo';

export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  const all = [{ name: 'Home', path: '/' }, ...items];
  return (
    <>
      <JsonLd data={breadcrumbLd(all)} />
      <nav aria-label="breadcrumb" className="text-xs text-faint">
        {all.map((it, i) => (
          <span key={it.path}>
            {i > 0 && <span className="mx-2">›</span>}
            {i === all.length - 1 ? <span className="text-mute">{it.name}</span> : <Link href={it.path} className="hover:text-ink hover:underline">{it.name}</Link>}
          </span>
        ))}
      </nav>
    </>
  );
}
