import fs from 'node:fs';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { UPLOAD_DIR } from './db';

export const OG_SIZE = { width: 1200, height: 630 };

/** Uploaded photo (/media/<file>) → data URL, so the share card can use the real photo. */
function photo(src?: string) {
  if (!src?.startsWith('/media/')) return undefined;
  try {
    const file = path.join(UPLOAD_DIR, path.basename(src));
    const ext = path.extname(file).slice(1).replace('jpg', 'jpeg');
    if (!['jpeg', 'png', 'webp'].includes(ext)) return undefined;
    return `data:image/${ext};base64,${fs.readFileSync(file).toString('base64')}`;
  } catch { return undefined; }
}

/** Branded 1200×630 share card used for WhatsApp/Instagram/Twitter/Google Discover previews. */
export function ogCard(o: { kicker: string; title: string; sub?: string; chips?: string[]; palette?: [string, string]; image?: string }) {
  const [a, b] = o.palette ?? ['#1d1d1f', '#0071e3'];
  const img = photo(o.image);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: `linear-gradient(150deg, ${a} 0%, ${b} 100%)`, color: 'white', fontFamily: 'sans-serif' }}>
        {img && <img src={img} alt="" width={1200} height={630} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.25) 45%, rgba(0,0,0,0.72) 100%)' }} />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', padding: '56px 64px' }}>
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>
            <span style={{ color: '#ffb36b' }}>Beyond</span><span style={{ marginLeft: 8, color: '#cfa8ff' }}>Explored</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 26, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.8)' }}>{o.kicker}</div>
            <div style={{ fontSize: o.title.length > 28 ? 68 : 84, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2, marginTop: 10, maxWidth: 1050 }}>{o.title}</div>
            {o.sub && <div style={{ fontSize: 32, marginTop: 18, color: 'rgba(255,255,255,0.88)', maxWidth: 1000, lineHeight: 1.25 }}>{o.sub.length > 110 ? o.sub.slice(0, 107) + '…' : o.sub}</div>}
            {!!o.chips?.length && (
              <div style={{ display: 'flex', gap: 12, marginTop: 26 }}>
                {o.chips.slice(0, 4).map((c) => <div key={c} style={{ display: 'flex', padding: '8px 18px', borderRadius: 999, background: 'rgba(255,255,255,0.18)', fontSize: 24 }}>{c}</div>)}
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' } },
  );
}
