-- Member-only write policies on the versions (audio) and covers buckets.
-- Both buckets already exist and are public.

update storage.buckets set public = true where id in ('versions','covers');

-- Helper: is the caller a member of ANY artist? (coarse; tighten to per-artist
-- path parsing when the platform opens up — spec §7.)
create or replace function public.is_any_artist_member()
  returns boolean language sql security definer set search_path = public, pg_temp stable
as $$
  select exists (select 1 from public.artist_members where user_id = auth.uid());
$$;
grant execute on function public.is_any_artist_member() to authenticated, anon;

-- Clean up any earlier policies that targeted a mis-named 'songs' bucket.
drop policy if exists "members write songs"  on storage.objects;
drop policy if exists "members update songs" on storage.objects;
drop policy if exists "members delete songs" on storage.objects;

-- versions bucket (audio)
drop policy if exists "members write versions" on storage.objects;
create policy "members write versions" on storage.objects for insert to authenticated
  with check (bucket_id = 'versions' and public.is_any_artist_member());
drop policy if exists "members update versions" on storage.objects;
create policy "members update versions" on storage.objects for update to authenticated
  using (bucket_id = 'versions' and public.is_any_artist_member());
drop policy if exists "members delete versions" on storage.objects;
create policy "members delete versions" on storage.objects for delete to authenticated
  using (bucket_id = 'versions' and public.is_any_artist_member());

-- covers bucket
drop policy if exists "members write covers" on storage.objects;
create policy "members write covers" on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and public.is_any_artist_member());
drop policy if exists "members update covers" on storage.objects;
create policy "members update covers" on storage.objects for update to authenticated
  using (bucket_id = 'covers' and public.is_any_artist_member());
drop policy if exists "members delete covers" on storage.objects;
create policy "members delete covers" on storage.objects for delete to authenticated
  using (bucket_id = 'covers' and public.is_any_artist_member());
