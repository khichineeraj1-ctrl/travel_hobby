import Link from 'next/link';
import { AdminHeader, ago } from '@/components/admin/ui';
import { dictSizes, i18nEnabled, i18nMeta, queueSizes } from '@/lib/i18n';
import { draftEnabled } from '@/lib/draft';
import { LANGS } from '@/lib/langs';

export const dynamic = 'force-dynamic';

export default function Languages() {
  const sizes = dictSizes();
  const q = queueSizes();
  const m = i18nMeta();
  const cap = Number(process.env.I18N_DAILY_CHARS) || 600_000;
  return (
    <>
      <AdminHeader title="Languages & AI" sub="The site is readable in 12 languages at /hi/…, /ta/… and so on. First-time visitors are switched to their state’s language automatically; the 🌐 button lets anyone change it." />
      {!i18nEnabled() && (
        <div className="card mb-6 border-l-4 border-[#f5a623] p-5 text-[15px]"><b>Translations are off.</b> Add <code>ANTHROPIC_API_KEY</code> in Railway → Variables. Until then, language pages show English text.</div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5"><p className="text-sm text-mute">Translated today</p><p className="text-2xl font-semibold">{m.day === new Date().toISOString().slice(0, 10) ? m.chars.toLocaleString('en-IN') : 0}</p><p className="text-xs text-faint">characters · daily cap {cap.toLocaleString('en-IN')} (I18N_DAILY_CHARS)</p></div>
        <div className="card p-5"><p className="text-sm text-mute">Last batch</p><p className="text-2xl font-semibold">{m.lastRun ? ago(m.lastRun) : '—'}</p><p className="text-xs text-faint">{m.calls ?? 0} batches today</p></div>
        <div className="card p-5"><p className="text-sm text-mute">AI drafting for writers</p><p className="text-2xl font-semibold">{draftEnabled() ? 'On' : 'Off'}</p><p className="text-xs text-faint">model {process.env.DRAFT_MODEL || 'claude-sonnet-4-5'}</p></div>
      </div>
      {m.lastError && <p className="mt-4 rounded-2xl bg-[#fff4e5] px-5 py-3 text-sm text-[#9a4b00]">Last problem: {m.lastError}</p>}
      <div className="card mt-6 divide-y divide-line/70">
        {LANGS.filter((l) => l.code !== 'en').map((l) => (
          <div key={l.code} className="flex flex-wrap items-center gap-4 px-6 py-4 text-[15px]">
            <span className="w-36 font-semibold">{l.native} <span className="font-normal text-mute">{l.name}</span></span>
            <span className="text-mute">{(sizes[l.code] ?? 0).toLocaleString('en-IN')} strings translated{q[l.code] ? ` · ${q[l.code]} in queue` : ''}</span>
            <Link href={`/${l.code}`} target="_blank" className="ml-auto text-sm text-blue-link hover:underline">View site in {l.name} ↗</Link>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-faint">How it works: each piece of text is translated once by Claude (cheap model, {process.env.I18N_MODEL || 'claude-haiku-4-5'}) the first time anyone opens a page in that language, then served from the cache for everyone. To warm a language, just open a few key pages in it. Set <code>LANG_AUTODETECT=off</code> to stop automatic switching.</p>
    </>
  );
}
