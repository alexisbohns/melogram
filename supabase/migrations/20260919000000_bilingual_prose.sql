-- Bilingual prose (2026-09-19).
--
-- `description` did two incompatible jobs: the short blurb in the strips and
-- the only place to write at length. It is split in two — `description` stays
-- short (strips, rows), `story` holds long markdown (the track and album
-- pages) — and both become bilingual via `_fr` columns.
--
-- The 200-character rule on `description` is NOT enforced here. Phase 1 seeds
-- `story` from today's descriptions, phase 2 is Alexis rewriting them by hand,
-- and phase 3 adds the check constraint. See the design spec, §9.

alter table public.tracks
  add column description_fr text,
  add column story          text,
  add column story_fr       text;

alter table public.albums
  add column description_fr text,
  add column story          text,
  add column story_fr       text;

-- Phase 1 seed: today's descriptions ARE the prose. Nothing is lost.
update public.tracks set story = description where description is not null;
update public.albums set story = description where description is not null;

-- The four write RPCs grow parameters. Postgres overloads rather than
-- replaces when a signature changed, so each old signature is dropped first —
-- otherwise PostgREST sees two candidates and the call fails. Parameter order
-- is English then French, description then story, in all four.

drop function if exists public.create_track(uuid, text, text, text);

create or replace function public.create_track(
  _album_id       uuid,
  _name           text,
  _description    text default null,
  _description_fr text default null,
  _story          text default null,
  _story_fr       text default null,
  _lyrics         text default null
) returns public.tracks
  language plpgsql security definer set search_path = public, pg_temp
as $$
declare _track public.tracks; _next int;
begin
  if not public.is_member_of_album(_album_id) then
    raise exception 'not a member of this album''s artist' using errcode = '42501';
  end if;
  insert into public.tracks (name, description, description_fr, story, story_fr, lyrics)
    values (_name, _description, _description_fr, _story, _story_fr, _lyrics)
    returning * into _track;
  select coalesce(max(position), 0) + 1 into _next
    from public.album_tracks where album_id = _album_id;
  insert into public.album_tracks (album_id, track_id, position)
    values (_album_id, _track.id, _next);
  return _track;
end $$;

drop function if exists public.update_track(uuid, text, text, text);

create or replace function public.update_track(
  _track_id       uuid,
  _name           text,
  _description    text,
  _description_fr text,
  _story          text,
  _story_fr       text,
  _lyrics         text
) returns public.tracks
  language plpgsql security definer set search_path = public, pg_temp
as $$
declare _track public.tracks;
begin
  if not public.is_member_of_track(_track_id) then
    raise exception 'not a member of this track''s artist' using errcode = '42501';
  end if;
  update public.tracks set
      name           = _name,
      description    = _description,
      description_fr = _description_fr,
      story          = _story,
      story_fr       = _story_fr,
      lyrics         = _lyrics
    where id = _track_id returning * into _track;
  return _track;
end $$;

drop function if exists public.create_album(uuid, text, public.album_type, text, uuid[]);

create or replace function public.create_album(
  _artist_id      uuid,
  _name           text,
  _type           public.album_type,
  _description    text default null,
  _description_fr text default null,
  _story          text default null,
  _story_fr       text default null,
  _genre_ids      uuid[] default '{}'
) returns public.albums
  language plpgsql security definer set search_path = public, pg_temp
as $$
declare _album public.albums;
begin
  if not public.is_artist_member(_artist_id) then
    raise exception 'not a member of artist %', _artist_id using errcode = '42501';
  end if;
  insert into public.albums (artist_id, name, type, description, description_fr, story, story_fr)
    values (_artist_id, _name, _type, _description, _description_fr, _story, _story_fr)
    returning * into _album;
  if array_length(_genre_ids, 1) is not null then
    insert into public.album_genres (album_id, genre_id)
      select _album.id, g from unnest(_genre_ids) g
      on conflict do nothing;
  end if;
  return _album;
end $$;

drop function if exists public.update_album(uuid, text, text, public.album_type);

create or replace function public.update_album(
  _album_id       uuid,
  _name           text,
  _description    text,
  _description_fr text,
  _story          text,
  _story_fr       text,
  _type           public.album_type
) returns public.albums
  language plpgsql security definer set search_path = public, pg_temp
as $$
declare _album public.albums;
begin
  if not public.is_member_of_album(_album_id) then
    raise exception 'not a member of this album''s artist' using errcode = '42501';
  end if;
  update public.albums set
      name           = _name,
      description    = _description,
      description_fr = _description_fr,
      story          = _story,
      story_fr       = _story_fr,
      type           = _type
    where id = _album_id
    returning * into _album;
  return _album;
end $$;
