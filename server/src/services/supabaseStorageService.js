import { ensureBucket, upload, removeFile, getPublicUrl } from './supabaseStorage.js';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../middleware/errorHandler.js';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'app-files';
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const EXT_BY_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

let bucketReady = false;
const readyBucket = async () => {
  if (bucketReady) return;
  if (!supabaseAdmin) {
    throw new AppError(
      'Supabase storage is not configured. Set SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY.',
      500,
      'STORAGE_UNCONFIGURED'
    );
  }
  await ensureBucket(BUCKET, { public: true, fileSizeLimit: MAX_FILE_SIZE });
  bucketReady = true;
};

export function validateFile(file) {
  if (!file) {
    throw new AppError('No file provided', 400, 'NO_FILE');
  }
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new AppError(
      `Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_TYPES.join(', ')}`,
      400,
      'INVALID_FILE_TYPE'
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new AppError('File size exceeds 5MB limit', 400, 'FILE_TOO_LARGE');
  }
}

export const uploadImage = async (file, folder = 'comeback-ai') => {
  await readyBucket();
  const ext = EXT_BY_TYPE[file.mimetype] || 'bin';
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  await upload(path, file.buffer, { contentType: file.mimetype, upsert: true });
  const url = getPublicUrl(path);

  return {
    url,
    publicId: path,
    width: null,
    height: null,
    format: ext,
  };
};

// Accepts either a storage path or a full Supabase public URL.
export const deleteImage = async (identifier) => {
  let path = identifier;
  if (typeof identifier === 'string' && identifier.includes('/storage/v1/object/public/')) {
    const marker = `/object/public/${BUCKET}/`;
    const idx = identifier.indexOf(marker);
    if (idx !== -1) path = identifier.slice(idx + marker.length);
  }
  try {
    await removeFile(path);
  } catch (error) {
    console.error(`Failed to delete image from Supabase Storage: ${path}`, error.message);
  }
};

export const uploadAvatar = (file, userId) =>
  uploadImage(file, `comeback-ai/avatars/${userId}`);

export const uploadProofImage = (file, taskId) =>
  uploadImage(file, `comeback-ai/proofs/${taskId}`);

export const uploadAttachment = (file, conversationId) =>
  uploadImage(file, `comeback-ai/attachments/${conversationId}`);

export default {
  validateFile,
  uploadImage,
  deleteImage,
  uploadAvatar,
  uploadProofImage,
  uploadAttachment,
};
