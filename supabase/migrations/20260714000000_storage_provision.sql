-- Self-contained (re-runnable) provisioning for the audio + cover Storage
-- buckets and their member-only write policies.
--
-- Why this exists: uploading a version's audio failed with "new row violates
-- row-level security policy". storage.objects has RLS enabled by default, and
-- the write policies from 20260712001000_storage_policies.sql had never been
-- applied to the hosted project (buckets were created by hand in the dashboard,
-- and there is no migration runner in this repo). With no INSERT policy on the
-- `versions` bucket, every upload is denied — even for a valid artist member.
--
-- This migration re-asserts everything the upload path needs, idempotently, so
-- it can be pasted into the Supabase SQL editor once to fix the live project and
-- also provisions Storage from scratch on a fresh database. Safe to run twice.

-- 1. Ensure the buckets exist and are public. `on conflict` makes this a no-op
--    (bar the public flag) for buckets that were already created manually.
insert into storage.buckets (id, name, public)
values ('versions', 'versions', true),
       ('covers',   'covers',   true)
on conflict (id) do update set public = true;

-- 2. Membership helper used by the Storage policies. Coarse by design (any
--    artist member may write to either bucket); tighten to per-artist path
--    parsing when the platform opens up. Recreated here so this migration is
--    self-sufficient even if 20260712001000 never ran.
create or replace function public.is_any_artist_member()
  returns boolean language sql security definer set search_path = public, pg_temp stable
as $$
  select exists (select 1 from public.artist_members where user_id = auth.uid());
$$;
grant execute on function public.is_any_artist_member() to authenticated, anon;

-- 3. Clean up any earlier policies that targeted a mis-named 'songs' bucket.
drop policy if exists "members write songs"  on storage.objects;
drop policy if exists "members update songs" on storage.objects;
drop policy if exists "members delete songs" on storage.objects;

-- 4. versions bucket (audio) — member-only write/update/delete.
drop policy if exists "members write versions" on storage.objects;
create policy "members write versions" on storage.objects for insert to authenticated
  with check (bucket_id = 'versions' and public.is_any_artist_member());
drop policy if exists "members update versions" on storage.objects;
create policy "members update versions" on storage.objects for update to authenticated
  using (bucket_id = 'versions' and public.is_any_artist_member());
drop policy if exists "members delete versions" on storage.objects;
create policy "members delete versions" on storage.objects for delete to authenticated
  using (bucket_id = 'versions' and public.is_any_artist_member());

-- 5. covers bucket — member-only write/update/delete.
drop policy if exists "members write covers" on storage.objects;
create policy "members write covers" on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and public.is_any_artist_member());
drop policy if exists "members update covers" on storage.objects;
create policy "members update covers" on storage.objects for update to authenticated
  using (bucket_id = 'covers' and public.is_any_artist_member());
drop policy if exists "members delete covers" on storage.objects;
create policy "members delete covers" on storage.objects for delete to authenticated
  using (bucket_id = 'covers' and public.is_any_artist_member());
