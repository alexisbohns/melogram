-- Associate every album with an artist. Backfill existing albums to bohns.

alter table public.albums
  add column if not exists artist_id uuid references public.artists(id);

update public.albums
  set artist_id = (select id from public.artists where lower(name) = 'bohns' limit 1)
  where artist_id is null;
