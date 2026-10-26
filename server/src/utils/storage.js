import crypto from 'node:crypto';
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { ApiError } from './ApiError.js';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

const ROOT = 'dormace';
const id = () => crypto.randomUUID();

// Re-encode every upload with sharp first: validates it is a real image and strips EXIF/GPS metadata.
async function clean(buffer, { width, format }) {
  try {
    const img = sharp(buffer, { limitInputPixels: 40e6 }).rotate().resize({ width, withoutEnlargement: true });
    return await (format === 'jpeg' ? img.jpeg({ quality: 85 }) : img.webp({ quality: 80 })).toBuffer();
  } catch {
    throw new ApiError(400, 'Invalid or corrupted image file');
  }
}

function send(buffer, options) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({ resource_type: 'image', overwrite: false, ...options }, (err, res) => (err ? reject(err) : resolve(res))).end(buffer);
  }).catch((e) => {
    console.error('Cloudinary upload failed:', e.message || e);
    throw new ApiError(502, 'Image upload failed, please try again');
  });
}

// Public images (listings, avatars, business logos). Returns the https Cloudinary URL to store in MongoDB.
export async function savePublicImage(buffer, folder, { width = 1200 } = {}) {
  const out = await clean(buffer, { width, format: 'webp' });
  const res = await send(out, { folder: `${ROOT}/${folder}`, public_id: id() });
  return res.secure_url;
}

// College ID cards. Uploaded as type "authenticated": there is NO public URL; only signed/admin-API access.
// Returns the Cloudinary public_id, which is what we store in the user record.
export async function savePrivateImage(buffer, folder) {
  const out = await clean(buffer, { width: 1600, format: 'jpeg' });
  const res = await send(out, { folder: `${ROOT}/private/${folder}`, public_id: id(), type: 'authenticated' });
  return res.public_id;
}

// Short-lived (5 min) download link created server-side; the admin route streams it so the link never reaches the browser.
export function privateDownloadUrl(publicId) {
  return cloudinary.utils.private_download_url(publicId, 'jpg', {
    resource_type: 'image',
    type: 'authenticated',
    expires_at: Math.floor(Date.now() / 1000) + 300,
  });
}

// https://res.cloudinary.com/<cloud>/image/upload/v123/dormace/items/abc.webp -> dormace/items/abc
const publicIdFromUrl = (url) => url?.match(/res\.cloudinary\.com\/[^/]+\/image\/upload\/(?:[^/]+\/)*?(?:v\d+\/)?(dormace\/.+)\.[a-z0-9]+$/i)?.[1];

export async function removePublic(url) {
  const pid = publicIdFromUrl(url);
  if (!pid) return;
  await cloudinary.uploader.destroy(pid, { resource_type: 'image', invalidate: true }).catch(() => {});
}

export async function removePrivate(publicId) {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image', type: 'authenticated', invalidate: true }).catch(() => {});
}
