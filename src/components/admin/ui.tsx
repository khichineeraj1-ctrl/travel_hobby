import Link from 'next/link';

export function Flash({ ok, err }: { ok?: string; err?: string }) {
  if (!ok && !err) return null;
  return (
    <div role="status" className={`mb-6 rounded-2xl px-5 py-3.5 text-[15px] ${err ? 'bg-[#fff0ed] text-[#b3261e]' : 'bg-[#e9f7ee] text-good'}`}>
      {err ?? ok}
    </div>
  );
}

export function AdminHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[34px] font-semibold tracking-tightest">{title}</h1>
        {sub && <p className="mt-1 text-mute">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="card p-6 sm:p-8">
      <h2 className="text-xl font-semibold tracking-headline">{title}</h2>
      {sub && <p className="mt-0.5 text-sm text-mute">{sub}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

export function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
    </label>
  );
}

export const Text = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={`field ${p.className ?? ''}`} />;
export const Area = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea rows={4} {...p} className={`field leading-relaxed ${p.className ?? ''}`} />;
export const Select = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={`field ${p.className ?? ''}`} />;

export function Check({ name, label, defaultChecked, value }: { name: string; label: string; defaultChecked?: boolean; value?: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[15px]">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="h-4 w-4 accent-[#0071e3]" />
      {label}
    </label>
  );
}

export function Badge({ tone, children }: { tone: 'green' | 'gray' | 'orange'; children: React.ReactNode }) {
  const c = { green: 'bg-[#e9f7ee] text-good', gray: 'bg-paper text-mute', orange: 'bg-[#fff4e5] text-eyebrow' }[tone];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${c}`}>{children}</span>;
}

export function DangerZone({ action, hidden, what }: { action: (fd: FormData) => Promise<void>; hidden: Record<string, string>; what: string }) {
  return (
    <form action={action} className="flex flex-wrap items-center gap-4">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <Check name="confirm" label={`Yes, permanently delete ${what}`} />
      <button className="rounded-full border border-[#d70015] px-4 py-1.5 text-sm text-[#d70015] hover:bg-[#d70015] hover:text-white">Delete</button>
    </form>
  );
}

export const BackLink = ({ href, label }: { href: string; label: string }) => (
  <Link href={href} className="mb-4 inline-block text-sm text-blue-link hover:underline">‹ {label}</Link>
);

/** Call / WhatsApp / email quick actions for a contact */
export function ContactActions({ phone, email, message }: { phone?: string; email?: string; message?: string }) {
  const digits = phone?.replace(/\D/g, '');
  return (
    <div className="flex flex-wrap gap-2">
      {digits && (
        <a href={`https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-2 text-sm font-medium text-white hover:opacity-90">WhatsApp</a>
      )}
      {phone && <a href={`tel:${phone}`} className="btn-secondary !px-4 !py-2 !text-sm">Call {phone}</a>}
      {email && <a href={`mailto:${email}`} className="btn-secondary !px-4 !py-2 !text-sm">Email</a>}
    </div>
  );
}

export const STATUS_TONE = {
  pending: 'orange', confirmed: 'gray', paid: 'green', cancelled: 'gray',
  new: 'orange', contacted: 'gray', converted: 'green', closed: 'gray',
} as const;

export const ago = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};
