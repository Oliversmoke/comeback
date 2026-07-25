import express from 'express';
import { healthCheck } from '../services/supabaseDb.js';
import { isSupabaseConfigured, isSupabaseAdminConfigured } from '../config/supabase.js';

const router = express.Router();

// Reports whether the server can reach the configured Supabase project.
router.get('/health', async (req, res) => {
  try {
    const result = await healthCheck();
    res.json({ success: result.ok, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Basic connection metadata (no secrets).
router.get('/info', (req, res) => {
  res.json({
    success: true,
    data: {
      configured: isSupabaseConfigured,
      adminConfigured: isSupabaseAdminConfigured,
      url: process.env.SUPABASE_URL || null,
      storageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'app-files',
    },
  });
});

export default router;
