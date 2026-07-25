import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { catchAsync, AppError } from '../middleware/errorHandler.js';
import AppBranding from '../models/AppBranding.js';
import { uploadImage, deleteImage } from '../services/cloudinaryService.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const router = Router();

async function getBranding() {
  let branding = await AppBranding.findOne({ key: 'branding' });
  if (!branding) {
    branding = await AppBranding.create({ key: 'branding' });
  }
  return branding;
}

router.get('/', catchAsync(async (req, res) => {
  const branding = await getBranding();
  res.json({ success: true, data: branding });
}));

router.post('/logo', authenticate, upload.single('image'), catchAsync(async (req, res) => {
  if (!req.file) throw new AppError('No image file provided', 400, 'NO_FILE');

  const result = await uploadImage(req.file, 'comeback-ai/branding');

  const branding = await getBranding();
  if (branding.logo.publicId) {
    await deleteImage(branding.logo.publicId).catch(() => {});
  }

  branding.logo = { url: result.url, publicId: result.publicId, updatedAt: new Date() };
  branding.updatedBy = req.user.id;
  await branding.save();

  res.json({ success: true, data: branding.logo });
}));

router.post('/background', authenticate, upload.single('image'), catchAsync(async (req, res) => {
  if (!req.file) throw new AppError('No image file provided', 400, 'NO_FILE');

  const result = await uploadImage(req.file, 'comeback-ai/branding');

  const branding = await getBranding();
  if (branding.background.publicId) {
    await deleteImage(branding.background.publicId).catch(() => {});
  }

  branding.background = { url: result.url, publicId: result.publicId, updatedAt: new Date() };
  branding.updatedBy = req.user.id;
  await branding.save();

  res.json({ success: true, data: branding.background });
}));

router.delete('/logo', authenticate, catchAsync(async (req, res) => {
  const branding = await getBranding();
  if (branding.logo.publicId) {
    await deleteImage(branding.logo.publicId).catch(() => {});
  }
  branding.logo = { url: '', publicId: '', updatedAt: new Date() };
  branding.updatedBy = req.user.id;
  await branding.save();
  res.json({ success: true, message: 'Logo reset to default' });
}));

router.delete('/background', authenticate, catchAsync(async (req, res) => {
  const branding = await getBranding();
  if (branding.background.publicId) {
    await deleteImage(branding.background.publicId).catch(() => {});
  }
  branding.background = { url: '', publicId: '', updatedAt: new Date() };
  branding.updatedBy = req.user.id;
  await branding.save();
  res.json({ success: true, message: 'Background reset to default' });
}));

export default router;
