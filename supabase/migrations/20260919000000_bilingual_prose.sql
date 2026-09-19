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

-- track_overview, recovered via pg_get_viewdef and brought under version
-- control for the first time (it predates this folder), plus the three new
-- track prose columns.
--
-- The new columns are appended at the END of the select list: `create or
-- replace view` may only add columns, never rename, retype or reorder the
-- existing ones, and slotting track_description_fr in next to
-- track_description would count as a reorder. src/lib/data.ts selects by
-- name, so position doesn't matter to the app.
--
-- security_invoker stays OFF (the view owner's rights), exactly as it was:
-- like_count aggregates public.track_likes, which RLS locks to its owner, so
-- under invoker rights an anonymous visitor's like_count would silently read
-- 0. Same reasoning as public.track_play_counts.
create or replace view public.track_overview
  with (security_invoker = off) as
  with latest_version as (
    select tv.track_id,
      v.id as latest_version_id,
      v.status as latest_status,
      v.resource_url as latest_resource_url,
      v.release_date as latest_release_date,
      row_number() over (
        partition by tv.track_id
        order by v.release_date desc, v.created_at desc, tv.created_at desc
      ) as rn
    from public.track_versions tv
      join public.versions v on v.id = tv.version_id
  ), primary_album as (
    select at.track_id,
      a.id as album_id,
      a.name as album_name,
      a.cover_url as album_cover_url,
      row_number() over (
        partition by at.track_id
        order by at.created_at desc
      ) as rn
    from public.album_tracks at
      join public.albums a on a.id = at.album_id
  )
  select t.id as track_id,
    t.name as track_name,
    t.description as track_description,
    pa.album_id,
    pa.album_name,
    pa.album_cover_url,
    lv.latest_version_id,
    lv.latest_status,
    lv.latest_resource_url,
    lv.latest_release_date,
    coalesce(tlc.like_count, 0::bigint) as like_count,
    t.description_fr as track_description_fr,
    t.story as track_story,
    t.story_fr as track_story_fr
  from public.tracks t
    left join latest_version lv on lv.track_id = t.id and lv.rn = 1
    left join primary_album pa on pa.track_id = t.id and pa.rn = 1
    left join public.track_like_counts tlc on tlc.track_id = t.id;

grant select on public.track_overview to anon, authenticated;
