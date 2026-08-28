-- Explicit artist-set order for the albums shown on the home page.
-- Backfill from the previous implicit order (newest album first) so the
-- catalog looks unchanged until the artist reorders it.

alter table public.albums
  add column if not exists "position" int;

with ordered as (
  select id,
         row_number() over (
           partition by artist_id order by created_at desc, id
         ) as rn
  from public.albums
)
update public.albums a
  set "position" = ordered.rn
  from ordered
  where ordered.id = a.id
    and a."position" is null;

-- Persist a full ordering in one call: the array is the artist's album list,
-- first to last. Albums missing from the array keep their current position
-- (the client always sends the complete list), and ids belonging to another
-- artist are ignored by the artist_id predicate.
create or replace function public.reorder_albums(
  _artist_id         uuid,
  _ordered_album_ids uuid[]
) returns void
  language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_artist_member(_artist_id) then
    raise exception 'not a member of artist %', _artist_id using errcode = '42501';
  end if;
  update public.albums a
    set "position" = o.ord
    from unnest(_ordered_album_ids) with ordinality as o(album_id, ord)
    where a.id = o.album_id
      and a.artist_id = _artist_id;
end $$;

revoke all on function public.reorder_albums(uuid, uuid[]) from public;
grant execute on function public.reorder_albums(uuid, uuid[]) to authenticated;
