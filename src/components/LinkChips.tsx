import Link from 'next/link';

export function LinkChips({ items }: { items: { href: string; label: string; active?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className={`chip ${i.active ? 'chip-on' : ''}`}>{i.label}</Link>
      ))}
    </div>
  );
}
