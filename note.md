# 📝 Project Documentation (Notes)

## 🎨 CSS Files
* `client/src/app/globals.css`

## 🛠️ TSX Files
* `client/src/app/page.tsx`
* `client/src/app/layout.tsx`
* `client/src/app/providers.tsx`
* `client/src/app/theme-script.tsx`
* `client/src/app/error.tsx`
* `client/src/app/not-found.tsx`
* `client/src/app/ai-coach/page.tsx`
* `client/src/app/ai-coach/loading.tsx`
* `client/src/app/auth/login/page.tsx`
* `client/src/app/auth/register/page.tsx`
* `client/src/app/auth/forgot-password/page.tsx`
* `client/src/app/auth/reset-password/page.tsx`
* `client/src/app/chat/page.tsx`
* `client/src/app/chat/loading.tsx`
* `client/src/app/dashboard/page.tsx`
* `client/src/app/dashboard/loading.tsx`
* `client/src/app/goals/page.tsx`
* `client/src/app/goals/new/page.tsx`
* `client/src/app/goals/[id]/page.tsx`
* `client/src/app/goals/loading.tsx`
* `client/src/app/groups/page.tsx`
* `client/src/app/groups/loading.tsx`
* `client/src/app/groups/[id]/page.tsx`
* `client/src/app/groups/[id]/chat/page.tsx`
* `client/src/app/leaderboard/page.tsx`
* `client/src/app/leaderboard/loading.tsx`
* `client/src/app/settings/page.tsx`
* `client/src/app/settings/loading.tsx`
* `client/src/app/tasks/page.tsx`
* `client/src/app/tasks/loading.tsx`
* `client/src/components/animations/MotionComponents.tsx`
* `client/src/components/error/ErrorBoundary.tsx`
* `client/src/components/features/MemoryPreferences.tsx`
* `client/src/components/features/TaskReviewModal.tsx`
* `client/src/components/layout/JinxEffects.tsx`
* `client/src/components/layout/Navbar.tsx`
* `client/src/components/layout/Sidebar.tsx`
* `client/src/components/ui/ThemeToggle.tsx`

## 🏗️ Core Layout & Providers
* `client/src/app/layout.tsx`
* `client/src/app/providers.tsx`

## 📍 Key Pages (Routes)
* `/` (Home)
* `/dashboard`
* `/ai-coach`
* `/auth/login`
* `/auth/register`
* `/goals`
* `/tasks`
* `/groups`
* `/chat`
* `/leaderboard`
* `/settings`

## 🔐 Admin Access (Supabase)
Project ref: `cvkkelnfttrpiqqzhhfq`
Dashboard: https://supabase.com/dashboard/project/cvkkelnfttrpiqqzhhfq

### How to get admin access
1. **Log in as the admin user** (created in Supabase Auth):
   - Email: `admin@comeback.ai`
   - Password: `ComebackAdmin#2026`  (TEMPORARY — change it in the dashboard)
   - The profile has `is_admin = true`, so RLS admin-override policies let this
     user read/write every table from the client.
2. **Change the password**: Supabase Dashboard → Authentication → Users →
   `admin@comeback.ai` → "Reset password" / "Update".
3. **Server-side (backend) admin**: the Node server uses the `service_role` key
   (`SUPABASE_SERVICE_ROLE_KEY` in `server/.env`), which bypasses RLS entirely.
   Paste the real key from Dashboard → Project Settings → API to enable it.
4. **Database Studio**: Dashboard → Table Editor
   (https://supabase.com/dashboard/project/cvkkelnfttrpiqqzhhfq/editor)

### Admin model notes
- `public.profiles.is_admin` column + `public.is_admin()` helper drive access.
- Admin-override `ALL` RLS policies exist on: profiles, goals, tasks, groups,
  messages, conversations.
- `groups`/`messages` are NOT world-readable — only members/participants or an
  admin can read them.
- Migrations live in `supabase/migrations/*.sql` (run `supabase db reset` locally
  to reproduce the admin setup).
