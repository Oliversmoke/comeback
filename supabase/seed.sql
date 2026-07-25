-- ============================================================================
-- comeback.AI — local seed (runs after migrations on `supabase db reset`)
-- Mirrors the cloud setup: creates the private app-files storage bucket and
-- the RLS policy that allows authenticated users to read/write in it.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('app-files', 'app-files', false, 52428800, null)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "app-files authed rw" on storage.objects;
create policy "app-files authed rw"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'app-files')
  with check (bucket_id = 'app-files');
