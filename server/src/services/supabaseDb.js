import { supabase, supabaseAdmin, isSupabaseConfigured, isSupabaseAdminConfigured } from '../config/supabase.js';

// Thin database layer over Supabase Postgres.
// Uses the admin client (bypasses RLS) for server-side operations.
// Pass `client` explicitly to run a query as a specific (RLS-scoped) user.

const client = () => {
  const c = supabaseAdmin || supabase;
  if (!c) throw new Error('Supabase is not configured (missing SUPABASE_URL / keys).');
  return c;
};

export const from = (table, userClient) => (userClient || client()).from(table);

export const query = async (table, options = {}) => {
  const { select = '*', eq, order, limit, client: userClient } = options;
  let q = from(table, userClient).select(select);
  if (eq) {
    for (const [col, val] of Object.entries(eq)) q = q.eq(col, val);
  }
  if (order) {
    const [column, ascending = true] = Array.isArray(order) ? order : [order, true];
    q = q.order(column, { ascending });
  }
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error) throw error;
  return data;
};

export const insert = async (table, rows, options = {}) => {
  const { onConflict, client: userClient } = options;
  let q = from(table, userClient).insert(rows).select();
  if (onConflict) q = q.onConflict(onConflict);
  const { data, error } = await q;
  if (error) throw error;
  return data;
};

export const update = async (table, match, patch, userClient) => {
  const q = from(table, userClient).update(patch).match(match).select();
  const { data, error } = await q;
  if (error) throw error;
  return data;
};

export const remove = async (table, match, userClient) => {
  const q = from(table, userClient).delete().match(match).select();
  const { data, error } = await q;
  if (error) throw error;
  return data;
};

export const healthCheck = async () => {
  if (!isSupabaseConfigured) {
    return { ok: false, configured: false, error: 'Supabase not configured' };
  }
  const t0 = Date.now();
  const { error } = await supabase.from('health_check').select('now').limit(1);
  const latencyMs = Date.now() - t0;
  // A missing `health_check` table still returns a 42P01 error; treat
  // reachability (no network error) as a successful connection.
  const reachable = !error || error.code !== 'ENOTFOUND';
  return {
    ok: reachable,
    configured: true,
    adminConfigured: isSupabaseAdminConfigured,
    latencyMs,
    error: reachable ? null : error.message,
  };
};

export default { from, query, insert, update, remove, healthCheck };
