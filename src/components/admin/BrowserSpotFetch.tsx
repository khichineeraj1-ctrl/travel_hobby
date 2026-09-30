'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OVERPASS_MIRRORS, osmQuery } from '@/lib/osmQuery';
import { saveBrowserSpots } from '@/app/admin/actions';

type P = { slug: string; name: string; lat: number; lng: number };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fetches OpenStreetMap spots from the admin's own browser, then saves them on the server. */
export function BrowserSpotFetch({ places, radiusKm }: { places: P[]; radiusKm: number }) {
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const add = (s: string) => setLog((l) => [s, ...l].slice(0, 40));

  async function fetchOne(p: P) {
    const body = `data=${encodeURIComponent(osmQuery(p, radiusKm))}`;
    for (let attempt = 0; attempt < 3; attempt++) {
      for (const url of OVERPASS_MIRRORS) {
        try {
          const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
          const text = await res.text();
          if (!res.ok || text.trimStart().startsWith('<')) continue;
          const j = JSON.parse(text);
          if (j.remark && /error/i.test(j.remark)) continue;
          return j.elements ?? [];
        } catch { /* next mirror */ }
      }
      await sleep(8000);
    }
    throw new Error('all OpenStreetMap servers busy');
  }

  async function run() {
    setBusy(true);
    let done = 0;
    for (const p of places) {
      add(`${p.name}: fetching…`);
      try {
        const els = await fetchOne(p);
        const r = await saveBrowserSpots(p.slug, els);
        add(`${p.name}: ${r.ok ? `${r.count} spots saved` : r.error}`);
        done++;
      } catch (e) {
        add(`${p.name}: ${(e as Error).message}`);
      }
      await sleep(1500);
    }
    add(`Finished — ${done}/${places.length} places updated.`);
    setBusy(false);
    router.refresh();
  }

  if (!places.length) return null;
  return (
    <div className="card mb-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{places.length} place{places.length > 1 ? 's' : ''} without spots</p>
          <p className="text-sm text-mute">Public OpenStreetMap servers often rate-limit cloud servers. This fetches from your browser instead (takes ~10–20s per place, keep this tab open).</p>
        </div>
        <button onClick={run} disabled={busy} className="btn btn-sm disabled:opacity-50">{busy ? 'Fetching…' : 'Fetch from my browser'}</button>
      </div>
      {log.length > 0 && <ul className="mt-4 max-h-60 space-y-1 overflow-auto text-sm text-mute">{log.map((l, i) => <li key={i}>{l}</li>)}</ul>}
    </div>
  );
}
