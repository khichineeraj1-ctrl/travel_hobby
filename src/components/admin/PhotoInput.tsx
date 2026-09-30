'use client';
import { useState } from 'react';

/** File picker with instant preview. Upload happens on form submit. */
export function PhotoInput({ current, name = 'image', aspect = 'aspect-[16/10]' }: { current?: string; name?: string; aspect?: string }) {
  const [preview, setPreview] = useState<string | undefined>(current);
  const [picked, setPicked] = useState(false);
  return (
    <div className="grid gap-5 sm:grid-cols-[280px_1fr] sm:items-center">
      <div className={`${aspect} overflow-hidden rounded-2xl bg-paper ring-1 ring-line`}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-faint">No photo yet</div>
        )}
      </div>
      <div className="space-y-3">
        <label className="btn-secondary cursor-pointer !py-2 !text-[15px]">
          {preview ? 'Replace photo' : 'Choose photo'}
          <input
            type="file"
            name={name}
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { setPreview(URL.createObjectURL(f)); setPicked(true); }
            }}
          />
        </label>
        <p className="text-xs text-faint">JPG, PNG, WebP or AVIF, up to 8 MB. Landscape works best (16:10). {picked && <b className="text-good">New photo selected — save to upload.</b>}</p>
        {current && (
          <label className="flex items-center gap-2 text-sm text-mute">
            <input type="checkbox" name="removeImage" className="h-4 w-4 accent-[#d70015]" /> Remove current photo
          </label>
        )}
      </div>
    </div>
  );
}
