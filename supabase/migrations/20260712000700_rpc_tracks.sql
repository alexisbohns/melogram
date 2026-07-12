-- Track CRUD + setlist ordering. create_track inserts the track AND the
-- album_tracks link at the next position in one call.

-- Guard: caller is a member of any artist that owns an album this track is on.
create or replace function public.is_member_of_track(_track_id uuid)
  returns boolean language sql security definer set search_path = public, pg_temp stable
as $$
  select exists (
    select 1
    from public.album_tracks at
    join public.albums a on a.id = at.album_id
    where at.track_id = _track_id
      and public.is_artist_member(a.artist_id)
  );
$$;

create or replace function public.create_track(
  _album_id    uuid,
  _name        text,
  _description text default null,
  _lyrics      text default null
) returns public.tracks
  language plpgsql security definer set search_path = public, pg_temp
as $$
declare _track public.tracks; _next int;
begin
  if not public.is_member_of_album(_album_id) then
    raise exception 'not a member of this album''s artist' using errcode = '42501';
  end if;
  insert into public.tracks (name, description, lyrics)
    values (_name, _description, _lyrics)
    returning * into _track;
  select coalesce(max(position), 0) + 1 into _next
    from public.album_tracks where album_id = _album_id;
  insert into public.album_tracks (album_id, track_id, position)
    values (_album_id, _track.id, _next);
  return _track;
end $$;

create or replace function public.update_track(
  _track_id uuid, _name text, _description text, _lyrics text
) returns public.tracks
  language plpgsql security definer set search_path = public, pg_temp
as $$
declare _track public.tracks;
begin
  if not public.is_member_of_track(_track_id) then
    raise exception 'not a member of this track''s artist' using errcode = '42501';
  end if;
  update public.tracks set name=_name, description=_description, lyrics=_lyrics
    where id=_track_id returning * into _track;
  return _track;
end $$;

-- Unlink a track from one album (renumber remaining positions), keep the track row.
create or replace function public.remove_track_from_album(_album_id uuid, _track_id uuid)
  returns void language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_member_of_album(_album_id) then
    raise exception 'not a member of this album''s artist' using errcode = '42501';
  end if;
  delete from public.album_tracks where album_id=_album_id and track_id=_track_id;
  with ordered as (
    select id, row_number() over (order by position, id) as rn
    from public.album_tracks where album_id=_album_id
  )
  update public.album_tracks at set position = ordered.rn
    from ordered where ordered.id = at.id;
end $$;

-- Delete a track everywhere: its album links, its version links, and its
-- now-orphaned versions. (Version files are cleaned up client-side.)
create or replace function public.delete_track(_track_id uuid)
  returns void language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_member_of_track(_track_id) then
    raise exception 'not a member of this track''s artist' using errcode = '42501';
  end if;
  delete from public.versions v
    using public.track_versions tv
    where tv.version_id = v.id and tv.track_id = _track_id;
  delete from public.track_versions where track_id = _track_id;
  delete from public.album_tracks where track_id = _track_id;
  delete from public.tracks where id = _track_id;
end $$;

-- Reorder a whole album's setlist from an ordered array of track ids.
create or replace function public.reorder_setlist(_album_id uuid, _ordered_track_ids uuid[])
  returns void language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_member_of_album(_album_id) then
    raise exception 'not a member of this album''s artist' using errcode = '42501';
  end if;
  update public.album_tracks at
    set position = ord.rn
    from (select id, ordinality::int as rn
          from unnest(_ordered_track_ids) with ordinality as u(id, ordinality)) ord
    where at.album_id = _album_id and at.track_id = ord.id;
end $$;

revoke all on function
  public.create_track(uuid,text,text,text),
  public.update_track(uuid,text,text,text),
  public.remove_track_from_album(uuid,uuid),
  public.delete_track(uuid),
  public.reorder_setlist(uuid,uuid[])
  from public;
grant execute on function
  public.create_track(uuid,text,text,text),
  public.update_track(uuid,text,text,text),
  public.remove_track_from_album(uuid,uuid),
  public.delete_track(uuid),
  public.reorder_setlist(uuid,uuid[])
  to authenticated;
