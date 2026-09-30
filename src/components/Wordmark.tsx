import { SITE_NAME } from '@/lib/seo';

/** Brand wordmark — "Beyond Explored" in the brand gradient. */
export function Wordmark({ className = '' }: { className?: string }) {
  return <span className={`brand-gradient font-semibold tracking-tight ${className}`}>{SITE_NAME}</span>;
}
