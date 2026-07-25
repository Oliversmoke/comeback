import { v2 as cloudinary } from 'cloudinary';
import { AppError } from '../middleware/errorHandler.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

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

export async function uploadImage(file, folder = 'comeback-ai') {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result) => {
        if (error) {
          reject(new AppError('Failed to upload image', 500, 'UPLOAD_FAILED'));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
        });
      }
    );
    uploadStream.end(file.buffer);
  });
}

export async function deleteImage(publicId) {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    console.error(`Failed to delete image from Cloudinary: ${publicId}`);
  }
}

export async function uploadAvatar(file, userId) {
  return uploadImage(file, `comeback-ai/avatars/${userId}`);
}

export async function uploadProofImage(file, taskId) {
  return uploadImage(file, `comeback-ai/proofs/${taskId}`);
}

export async function uploadAttachment(file, conversationId) {
  return uploadImage(file, `comeback-ai/attachments/${conversationId}`);
}
