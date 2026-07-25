-- ============================================================================
-- comeback.AI — Supabase schema (starter)
-- Mirrors the existing Mongoose models. Auth is handled by Supabase Auth
-- (auth.users); application data references auth.users(id) via `profiles`.
--
-- Apply with:  supabase db execute < supabase/schema.sql
--   or paste into the Supabase SQL editor.
-- ============================================================================

-- Used by the server health check (supabaseDb.healthCheck).
create table if not exists public.health_check (now timestamptz default now());

-- ---------------------------------------------------------------------------
-- profiles — extends auth.users with app-specific profile data.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  username text unique not null,
  display_name text,
  avatar text,
  bio text,
  provider text default 'local',
  provider_id text,
  xp int default 0,
  level int default 1,
  streak int default 0,
  longest_streak int default 0,
  last_active_date timestamptz,
  completed_tasks int default 0,
  is_online boolean default false,
  last_seen timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- goals
-- ---------------------------------------------------------------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  category text default 'other',
  priority text default 'medium',
  status text default 'active',
  start_date timestamptz default now(),
  target_date timestamptz,
  completed_date timestamptz,
  progress int default 0 check (progress between 0 and 100),
  milestones jsonb default '[]',
  tags text[] default '{}',
  is_ai_generated boolean default false,
  ai_insights jsonb,
  shared_with_groups uuid[] default '{}',
  xp_awarded int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists goals_user_status_idx on public.goals (user_id, status);
create index if not exists goals_category_status_idx on public.goals (category, status);

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid references public.goals (id) on delete set null,
  group_id uuid,
  title text not null,
  description text,
  priority text default 'medium',
  status text default 'pending',
  due_date timestamptz,
  scheduled_date timestamptz,
  completed_at timestamptz,
  xp_reward int default 10,
  is_ai_generated boolean default false,
  ai_context jsonb,
  proof jsonb,
  ai_review jsonb,
  is_daily_task boolean default false,
  date_for date,
  dependencies uuid[] default '{}',
  completed_by uuid[] default '{}',
  is_group_task boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists tasks_user_status_idx on public.tasks (user_id, status, due_date);
create index if not exists tasks_group_status_idx on public.tasks (group_id, status);
create index if not exists tasks_datefor_user_idx on public.tasks (date_for, user_id);

-- ---------------------------------------------------------------------------
-- groups
-- ---------------------------------------------------------------------------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  cover_image text,
  category text default 'other',
  created_by uuid not null references auth.users (id) on delete cascade,
  members jsonb default '[]',
  is_private boolean default false,
  invite_code text unique,
  max_members int default 50,
  total_xp int default 0,
  streak int default 0,
  last_activity_date timestamptz,
  rules text[] default '{}',
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists groups_category_xp_idx on public.groups (category, total_xp desc);

-- ---------------------------------------------------------------------------
-- messages (group chat)
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  message_type text default 'text',
  attachments jsonb default '[]',
  mentions uuid[] default '{}',
  read_by uuid[] default '{}',
  edited_at timestamptz,
  is_deleted boolean default false,
  created_at timestamptz default now()
);
create index if not exists messages_group_created_idx on public.messages (group_id, created_at desc);

-- ---------------------------------------------------------------------------
-- conversations (1:1)
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  participants uuid[] not null,
  last_message jsonb,
  last_activity_at timestamptz default now(),
  created_at timestamptz default now()
);
create index if not exists conversations_participants_idx on public.conversations using gin (participants);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Users can only access rows that belong to them; group membership is
-- enforced in the API layer (service-role) where needed.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.tasks enable row level security;
alter table public.groups enable row level security;
alter table public.messages enable row level security;
alter table public.conversations enable row level security;

drop policy if exists "profiles self" on public.profiles;
create policy "profiles self" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "goals owner" on public.goals;
create policy "goals owner" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tasks owner" on public.tasks;
create policy "tasks owner" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Groups: readable by everyone; writable by the creator/admin via the API.
drop policy if exists "groups readable" on public.groups;
create policy "groups readable" on public.groups for select using (true);

drop policy if exists "messages group members" on public.messages;
create policy "messages group members" on public.messages for select using (true);

drop policy if exists "conversations participants" on public.conversations;
create policy "conversations participants" on public.conversations
  for all using (auth.uid() = any (participants)) with check (auth.uid() = any (participants));

-- ---------------------------------------------------------------------------
-- Admin access
-- `is_admin` flag on profiles + an `is_admin()` helper, with admin-override
-- policies so an admin user can read/write all rows. Group/message reads are
-- restricted to members/participants (or admin) — no longer world-readable.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

drop policy if exists "groups readable" on public.groups;
create policy "groups readable" on public.groups for select
  using (
    public.is_admin()
    or created_by = auth.uid()
    or auth.uid() = any (select jsonb_array_elements_text(members)::uuid)
  );

drop policy if exists "messages group members" on public.messages;
create policy "messages readable" on public.messages for select
  using (
    public.is_admin()
    or sender_id = auth.uid()
    or auth.uid() = any (mentions)
    or exists (
      select 1 from public.groups g
      where g.id = group_id
        and (g.created_by = auth.uid()
             or auth.uid() = any (select jsonb_array_elements_text(g.members)::uuid))
    )
  );

drop policy if exists "profiles admin" on public.profiles;
create policy "profiles admin" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "goals admin" on public.goals;
create policy "goals admin" on public.goals
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "tasks admin" on public.tasks;
create policy "tasks admin" on public.tasks
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "groups admin" on public.groups;
create policy "groups admin" on public.groups
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "messages admin" on public.messages;
create policy "messages admin" on public.messages
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "conversations admin" on public.conversations;
create policy "conversations admin" on public.conversations
  for all using (public.is_admin()) with check (public.is_admin());
