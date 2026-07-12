-- Album CRUD. Every function checks membership first and raises
-- insufficient_privilege (42501) for non-members. Album type enum is
-- public.album_type (values: single | ep | album).

-- Guard: caller is a member of the album's artist.
create or replace function public.is_member_of_album(_album_id uuid)
  returns boolean language sql security definer set search_path = public, pg_temp stable
as $$
  select public.is_artist_member((select artist_id from public.albums where id = _album_id));
$$;

create or replace function public.create_album(
  _artist_id   uuid,
  _name        text,
  _type        public.album_type,
  _description text default null,
  _genre_ids   uuid[] default '{}'
) returns public.albums
  language plpgsql security definer set search_path = public, pg_temp
as $$
declare _album public.albums;
begin
  if not public.is_artist_member(_artist_id) then
    raise exception 'not a member of artist %', _artist_id using errcode = '42501';
  end if;
  insert into public.albums (artist_id, name, type, description)
    values (_artist_id, _name, _type, _description)
    returning * into _album;
  if array_length(_genre_ids, 1) is not null then
    insert into public.album_genres (album_id, genre_id)
      select _album.id, g from unnest(_genre_ids) g
      on conflict do nothing;
  end if;
  return _album;
end $$;

create or replace function public.update_album(
  _album_id    uuid,
  _name        text,
  _description text,
  _type        public.album_type
) returns public.albums
  language plpgsql security definer set search_path = public, pg_temp
as $$
declare _album public.albums;
begin
  if not public.is_member_of_album(_album_id) then
    raise exception 'not a member of this album''s artist' using errcode = '42501';
  end if;
  update public.albums
    set name = _name, description = _description, type = _type
    where id = _album_id
    returning * into _album;
  return _album;
end $$;

create or replace function public.delete_album(_album_id uuid)
  returns void language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_member_of_album(_album_id) then
    raise exception 'not a member of this album''s artist' using errcode = '42501';
  end if;
  delete from public.albums where id = _album_id;
end $$;

create or replace function public.set_album_genres(_album_id uuid, _genre_ids uuid[])
  returns void language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_member_of_album(_album_id) then
    raise exception 'not a member of this album''s artist' using errcode = '42501';
  end if;
  delete from public.album_genres where album_id = _album_id;
  if array_length(_genre_ids, 1) is not null then
    insert into public.album_genres (album_id, genre_id)
      select _album_id, g from unnest(_genre_ids) g
      on conflict do nothing;
  end if;
end $$;

-- Client uploads the cover to Storage, then passes the SDK getPublicUrl() result
-- here (machine-written, never hand-typed).
create or replace function public.set_album_cover(_album_id uuid, _cover_url text)
  returns void language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_member_of_album(_album_id) then
    raise exception 'not a member of this album''s artist' using errcode = '42501';
  end if;
  update public.albums set cover_url = _cover_url where id = _album_id;
end $$;

revoke all on function
  public.create_album(uuid,text,public.album_type,text,uuid[]),
  public.update_album(uuid,text,text,public.album_type),
  public.delete_album(uuid),
  public.set_album_genres(uuid,uuid[]),
  public.set_album_cover(uuid,text)
  from public;
grant execute on function
  public.create_album(uuid,text,public.album_type,text,uuid[]),
  public.update_album(uuid,text,text,public.album_type),
  public.delete_album(uuid),
  public.set_album_genres(uuid,uuid[]),
  public.set_album_cover(uuid,text)
  to authenticated;
