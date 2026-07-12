-- Ensure public read on artists + content, and (idempotently) that RLS is on.
-- Writes are intentionally NOT granted to client roles; SECURITY DEFINER RPCs
-- (Tasks 6-9) are the only write path.

alter table public.artists        enable row level security;
alter table public.albums         enable row level security;
alter table public.tracks         enable row level security;
alter table public.versions       enable row level security;
alter table public.album_tracks   enable row level security;
alter table public.track_versions enable row level security;

drop policy if exists "public read artists" on public.artists;
create policy "public read artists" on public.artists for select using (true);

drop policy if exists "public read albums" on public.albums;
create policy "public read albums" on public.albums for select using (true);

drop policy if exists "public read tracks" on public.tracks;
create policy "public read tracks" on public.tracks for select using (true);

drop policy if exists "public read versions" on public.versions;
create policy "public read versions" on public.versions for select using (true);

drop policy if exists "public read album_tracks" on public.album_tracks;
create policy "public read album_tracks" on public.album_tracks for select using (true);

drop policy if exists "public read track_versions" on public.track_versions;
create policy "public read track_versions" on public.track_versions for select using (true);
