# 📋 Deployment Status & What's Missing (note2.md)

Backend target: Node server (`server/src/server.js`) — Supabase-only mode.
Supabase project ref: `cvkkelnfttrpiqqzhhfq`

## ✅ Done
- Supabase schema deployed (7 tables): profiles, goals, tasks, groups, messages, conversations, health_check
- RLS enabled on all tables + per-owner policies
- Admin model: `profiles.is_admin` + `public.is_admin()` helper + admin-override ALL policies
- `groups`/`messages` locked down (no longer world-readable)
- Storage bucket `app-files` created + storage RLS policy
- Backend boots and reaches Supabase: `/health` ✅, `/api/supabase/health` ✅ (configured: true)
- MongoDB made optional (skipped when `MONGODB_URI` empty) — server runs Supabase-only
- Fixed dotenv load-order bug (env now read before module imports)
- Admin user created: `admin@comeback.ai` / `ComebackAdmin#2026` (is_admin = true)
- Local setup prepared: `supabase/config.toml`, `supabase/migrations/*.sql`, `supabase/seed.sql`
- Env files: `server/.env`, `client/.env.local`, updated `.example` files
- `package.json` helper scripts: supabase:start/stop/reset/status

## ❌ Missing (to be fully operational + deployed)

### 1. Secrets not yet filled in — `server/.env`
- `SUPABASE_SERVICE_ROLE_KEY` — still placeholder `your-supabase-service-role-key`
  → REQUIRED for storage uploads, profile creation, server-side admin writes
- `SUPABASE_SECRET_KEY` — still placeholder `sb_secret_xxx`
- `DATABASE_URL` / `DIRECT_URL` — still `YOUR_DB_PASSWORD` + `<region>` placeholders
  (only needed if using Prisma directly; routes use the Supabase client)
- `JWT_SECRET` — dev value; change for production

### 2. No deployment host
- Railway config removed (`railway.json` + workflow deleted)
- `render.yaml` exists but needs Render auth (CLI login or GitHub connect) — can't do headless
- Without a host, backend runs only locally (verified on :5055)

### 3. No admin app surface
- DB admin access exists, but no admin API route or UI exposes it yet
- Suggested: add `/api/admin/*` guarded by `public.is_admin()`

### 4. Uncommitted / unpushed work
- All changes uncommitted: Supabase config, dotenv fix, env files, note.md, removed railway.json
- Not pushed to `origin` (github.com/Oliversmoke/Comeback.ai.git)

## 🔑 To finish — items needed from user
1. Real **service_role key** (Dashboard → Project Settings → API) → put in `server/.env`, then run end-to-end insert test
2. A **deploy target**: connect GitHub repo to Render (uses existing `render.yaml`), OR build a Docker image for any host
3. (Optional) **admin API route** guarded by `is_admin()`

## 🔐 Admin access (recap)
- Login: `admin@comeback.ai` / `ComebackAdmin#2026` (TEMPORARY — change in dashboard)
- Change password: Dashboard → Authentication → Users
- Server admin: paste real `SUPABASE_SERVICE_ROLE_KEY` into `server/.env`
- Studio: https://supabase.com/dashboard/project/cvkkelnfttrpiqqzhhfq/editor

## 🚀 Local run (needs Docker socket access — sudo usermod -aG docker $USER)
- `supabase start` → `supabase db reset` (loads migrations + seed)
- `npm run dev` (server :5000, client :3000, Studio :54323)
