import type { Author } from '@/lib/types';

/** Photo if uploaded, otherwise initials on the brand gradient. */
export function AuthorAvatar({ a, size = 40 }: { a: Author; size?: number }) {
  const style = { width: size, height: size };
  if (a.photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={a.photo} alt={a.name} style={style} className="shrink-0 rounded-full object-cover" />;
  }
  const initials = a.name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span style={{ ...style, fontSize: size * 0.36 }} className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#ff7a18] via-[#a855f7] to-[#0071e3] font-semibold text-white" aria-hidden>
      {initials}
    </span>
  );
}
