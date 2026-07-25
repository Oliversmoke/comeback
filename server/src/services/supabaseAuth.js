import { supabase, supabaseAdmin, isSupabaseConfigured, isSupabaseAdminConfigured } from '../config/supabase.js';
import {
  verifyAuth,
  createContextClient,
  createAdminClient,
} from '@supabase/server/core';

// Supabase Auth helpers for the server.
// - signUp / signIn / signOut operate with the user's credentials.
// - verifyAccessToken / getUser use the admin client to validate a JWT
//   (e.g. issued by Supabase on the client) without a DB round-trip.

export const signUp = async ({ email, password, options = {} }) => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.signUp({ email, password, options });
  if (error) throw error;
  return data;
};

export const signIn = async ({ email, password }) => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const signOut = async (accessToken) => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');
  const { error } = await supabase.auth.signOut(
    accessToken ? { accessToken } : undefined
  );
  if (error) throw error;
  return true;
};

// Validate a Supabase access token using the admin API.
export const verifyAccessToken = async (accessToken) => {
  if (!isSupabaseAdminConfigured) throw new Error('Supabase admin not configured (service role key missing)');
  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return data.user;
};

export const getUser = verifyAccessToken;

// Exchange a Google OAuth `id_token` (from the client) for a Supabase session.
export const signInWithIdToken = async ({ provider, token, nonce }) => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.signInWithIdToken({ provider, token, nonce });
  if (error) throw error;
  return data;
};

// Generate a Magic Link / OTP email for passwordless login.
export const sendMagicLink = async (email, options = {}) => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.signInWithOtp({ email, options });
  if (error) throw error;
  return data;
};

// Resolve a Supabase user id from an incoming Authorization: Bearer header.
export const userFromAuthorization = async (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return verifyAccessToken(token);
};

// ---------------------------------------------------------------------------
// @supabase/server — framework-agnostic JWT verification (JWKS-based).
// Prefer these for verifying inbound requests: they validate the token
// cryptographically against Supabase's JWKS and don't need the service-role
// key (unlike verifyAccessToken, which calls the admin API).
// ---------------------------------------------------------------------------

// Build a Web `Request` from an Express request so we can reuse the
// framework-agnostic @supabase/server primitives.
const expressToWebRequest = (req) => {
  const host = req.headers.host || 'localhost';
  const protocol = req.secure || req.protocol === 'https' ? 'https' : 'http';
  const url = `${protocol}://${host}${req.originalUrl || req.url}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
  }
  return new Request(url, { method: req.method || 'GET', headers });
};

// Verify the request's credentials. Accepts a signed-in user JWT or a
// publishable key (API key). Returns the AuthResult or null on failure.
export const verifyRequest = async (req, options = {}) => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');
  const request = expressToWebRequest(req);
  const { data, error } = await verifyAuth(request, {
    auth: options.auth || ['user', 'publishable'],
  });
  if (error) return null;
  return data;
};

// RLS-scoped Supabase client for the verified request (uses the caller's JWT).
export const contextClient = (authResult) =>
  createContextClient({ auth: { token: authResult.token, keyName: authResult.keyName } });

// Admin client that bypasses RLS (requires the secret/service-role key).
export const adminClient = () => createAdminClient();

// Express middleware: require a valid Supabase session (user JWT).
// On success, attaches `req.supabaseUser` (userClaims) and `req.supabaseAuth`.
export const requireSupabaseAuth = async (req, res, next) => {
  try {
    const auth = await verifyRequest(req, { auth: ['user'] });
    if (!auth || !auth.userClaims) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    req.supabaseAuth = auth;
    req.supabaseUser = auth.userClaims;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: error.message });
  }
};

export default {
  signUp,
  signIn,
  signOut,
  verifyAccessToken,
  getUser,
  signInWithIdToken,
  sendMagicLink,
  userFromAuthorization,
  verifyRequest,
  contextClient,
  adminClient,
  requireSupabaseAuth,
};
