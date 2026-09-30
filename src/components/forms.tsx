'use client';

export function FieldBox({ label, error, hint, children, className = '' }: { label: string; error?: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-[#d70015]">{error}</span> : hint ? <span className="mt-1 block text-xs text-faint">{hint}</span> : null}
    </label>
  );
}

export const inputCls = (err?: string) => `field ${err ? '!border-[#d70015] focus:!ring-[#d70015]/15' : ''}`;

/** hidden spam trap — real people never see or fill it */
export const Honeypot = () => (
  <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
    <label>Website<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
  </div>
);

export function Consent({ error, text }: { error?: string; text?: string }) {
  return (
    <label className="flex items-start gap-2.5 text-sm text-mute">
      <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 shrink-0 accent-[#0071e3]" />
      <span>
        {text ?? 'I agree to be contacted on phone, WhatsApp or email about my request.'}
        {error && <span className="block text-xs text-[#d70015]">{error}</span>}
      </span>
    </label>
  );
}
