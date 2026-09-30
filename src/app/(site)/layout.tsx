import { GlobalNav, Banner, Footer } from '@/components/Chrome';
import { Guide } from '@/components/Guide';
import { TakeAway } from '@/components/TakeAway';
import { AskBeyond } from '@/components/AskBeyond';
import { assistantEnabled } from '@/lib/assistant';
import { JsonLd } from '@/lib/jsonld';
import { SITE_NAME, SITE_URL } from '@/lib/seo';

/**
 * Render on request. Content lives on a persistent volume that isn't available at build time,
 * so prerendering would bake in stale seed data after every deploy. readDb() is memoised by
 * file mtime, so this stays fast.
 */
export const dynamic = 'force-dynamic';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
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
