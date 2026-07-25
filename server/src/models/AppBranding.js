import mongoose from 'mongoose';

const appBrandingSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'branding' },
  logo: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
    updatedAt: Date,
  },
  background: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
    updatedAt: Date,
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('AppBranding', appBrandingSchema);
