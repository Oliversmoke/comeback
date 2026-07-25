import { supabase, supabaseAdmin, isSupabaseAdminConfigured } from '../config/supabase.js';

// Supabase Storage helpers. Replaces the Cloudinary file-upload flow.
// All admin operations use the service-role client (bypasses RLS).

const DEFAULT_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'app-files';

const admin = () => {
  if (!isSupabaseAdminConfigured) {
    throw new Error('Supabase storage requires SUPABASE_SERVICE_ROLE_KEY');
  }
  return supabaseAdmin;
};

// Ensure a bucket exists (idempotent). `public` buckets serve files via URL.
export const ensureBucket = async (bucket = DEFAULT_BUCKET, opts = { public: true }) => {
  const c = admin();
  const { data: existing } = await c.storage.getBucket(bucket);
  if (existing) return existing;
  const { data, error } = await c.storage.createBucket(bucket, {
    public: opts.public,
    fileSizeLimit: opts.fileSizeLimit || 50 * 1024 * 1024,
    allowedMimeTypes: opts.allowedMimeTypes || null,
  });
  if (error) throw error;
  return data;
};

export const upload = async (path, fileBody, opts = {}) => {
  const c = admin();
  const bucket = opts.bucket || DEFAULT_BUCKET;
  const { data, error } = await c.storage
    .from(bucket)
    .upload(path, fileBody, {
      contentType: opts.contentType,
      upsert: opts.upsert ?? true,
      cacheControl: opts.cacheControl || '3600',
    });
  if (error) throw error;
  return data;
};

export const removeFile = async (path, bucket = DEFAULT_BUCKET) => {
  const c = admin();
  const { data, error } = await c.storage.from(bucket).remove([path]);
  if (error) throw error;
  return data;
};

export const getPublicUrl = (path, bucket = DEFAULT_BUCKET) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

export const createSignedUrl = async (path, expiresIn = 3600, bucket = DEFAULT_BUCKET) => {
  const c = admin();
  const { data, error } = await c.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
};

export const download = async (path, bucket = DEFAULT_BUCKET) => {
  const c = admin();
  const { data, error } = await c.storage.from(bucket).download(path);
  if (error) throw error;
  return data;
};

export default {
  ensureBucket,
  upload,
  removeFile,
  getPublicUrl,
  createSignedUrl,
  download,
  DEFAULT_BUCKET,
};
