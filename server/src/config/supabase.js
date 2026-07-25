import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load .env before reading any env vars. ES module imports are hoisted, so this
// must run before the config values below are evaluated.
dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '.env') });

const url = process.env.SUPABASE_URL;
// Support both the new publishable/secret key naming and the legacy
// anon/service-role naming. The publishable key is the browser-safe "anon"
// equivalent; the secret key replaces the service-role key.
const anonKey =
  process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const serviceRoleKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey) {
  console.warn(
    '[supabase] SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY/SUPABASE_ANON_KEY are not set. ' +
      'Supabase features will be unavailable until they are configured.'
  );
}

// Public/anon client — safe to use where you only need unauthenticated,
// RLS-protected access. Never expose the service-role/secret key to the browser.
export const supabase = url && anonKey
  ? createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

// Admin client — bypasses RLS. Server-side use only. Requires the
// secret/service-role key. Keep this secret.
export const supabaseAdmin = url && serviceRoleKey
  ? createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export const isSupabaseConfigured = Boolean(supabase);
export const isSupabaseAdminConfigured = Boolean(supabaseAdmin);

export default supabase;
