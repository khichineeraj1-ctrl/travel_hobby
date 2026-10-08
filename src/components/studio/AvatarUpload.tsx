'use client';

import { useRef, useState } from 'react';

/** Uploads a headshot via the studio upload route and drops its URL into a hidden input. */
export function AvatarUpload({ initial, name }: { initial?: string; name: string }) {
  const [src, setSrc] = useState(initial ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-4">
      {src
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt="" className="h-20 w-20 rounded-full object-cover" />
        : <span className="grid h-20 w-20 place-items-center rounded-full bg-paper text-2xl">🙂</span>}
      <input type="hidden" name={name} value={src} />
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setBusy(true); setErr('');
        const fd = new FormData(); fd.append('file', f); fd.append('kind', 'avatar');
        const r = await fetch('/api/studio/upload', { method: 'POST', body: fd });
        const j = await r.json();
        if (r.ok) setSrc(j.src); else setErr(j.error || 'Upload failed');
        setBusy(false);
      }} />
      <button type="button" onClick={() => ref.current?.click()} className="btn-secondary btn-sm">{busy ? 'Uploading…' : src ? 'Change photo' : 'Upload photo'}</button>
      {err && <span className="text-sm text-[#d70015]">{err}</span>}
    </div>
  );
}
