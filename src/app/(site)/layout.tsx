import { GlobalNav, Banner, Footer } from '@/components/Chrome';
import { Guide } from '@/components/Guide';
import { TakeAway } from '@/components/TakeAway';
import { AskBeyond } from '@/components/AskBeyond';
import { assistantEnabled } from '@/lib/assistant';
import { JsonLd } from '@/lib/jsonld';
import { SITE_NAME, SITE_URL, abs } from '@/lib/seo';
import { cookies } from 'next/headers';
import { AutoTranslate } from '@/components/AutoTranslate';
import { AutoLangNote } from '@/components/LangSwitcher';
import { getLang, getPath } from '@/lib/i18n';
import { LANGS, withLang } from '@/lib/langs';

/**
 * Render on request. Content lives on a persistent volume that isn't available at build time,
 * so prerendering would bake in stale seed data after every deploy. readDb() is memoised by
 * file mtime, so this stays fast.
 */
export const dynamic = 'force-dynamic';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  const path = await getPath();
  const auto = (await cookies()).get('be_auto')?.value;
  return (
    <>
      {/* one canonical per language + hreflang alternates (React hoists these into <head>) */}
      <link rel="canonical" href={abs(withLang(lang, path))} />
      {LANGS.map((l) => <link key={l.code} rel="alternate" hrefLang={l.hreflang} href={abs(withLang(l.code, path))} />)}
      <link rel="alternate" hrefLang="x-default" href={abs(path)} />
      <AutoTranslate lang={lang} />
      {auto && lang !== 'en' && <AutoLangNote lang={lang} region={auto} />}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: SITE_NAME,
          url: SITE_URL,
          description: 'Offbeat India travel discovery and impromptu trip planner.',
        }}
      />
      <GlobalNav />
      <Banner />
      <main>{children}</main>
      <TakeAway />
      <Footer />
      <Guide ask={assistantEnabled()} />
      {assistantEnabled() && <AskBeyond />}
    </>
  );
}
