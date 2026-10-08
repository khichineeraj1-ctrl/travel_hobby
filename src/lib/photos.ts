import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { UPLOAD_DIR } from './db';

/**
 * Save a contributor photo safely: auto-rotate, resize, re-encode as JPEG — which also strips EXIF/GPS
 * (phones embed the exact location of the photo). Cover photos are cropped to 16:9 at 1600×900 for Discover.
 */
export async function savePhoto(file: File, kind: 'cover' | 'photo' | 'avatar'): Promise<{ src: string; width: number; height: number }> {
  if (!/^image\/(jpeg|png|webp|avif|heic|heif)$/.test(file.type)) throw new Error('Use a JPG, PNG, WebP or HEIC photo.');
  if (file.size > 15 * 1024 * 1024) throw new Error('Photo must be under 15 MB.');
  const input = Buffer.from(await file.arrayBuffer());
  let sharp: (typeof import('sharp'))['default'] | null = null;
  try { sharp = (await import('sharp')).default; } catch { sharp = null; }
  if (!sharp) throw new Error('Photo processing is unavailable on the server right now.');
  let img = sharp(input, { failOn: 'none' }).rotate();
  img = kind === 'cover' ? img.resize(1600, 900, { fit: 'cover', position: 'attention' })
    : kind === 'avatar' ? img.resize(400, 400, { fit: 'cover', position: 'attention' })
      : img.resize(1600, 1600, { fit: 'inside', withoutEnlargement: true });
  const { data, info } = await img.jpeg({ quality: 80, progressive: true, mozjpeg: true }).toBuffer({ resolveWithObject: true });
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${kind}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}.jpg`;
  await fs.writeFile(path.join(UPLOAD_DIR, name), data);
  return { src: `/media/${name}`, width: info.width, height: info.height };
}
