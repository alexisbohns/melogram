-- Version CRUD. create_version inserts the version + track_versions link and
-- returns the deterministic Storage upload path. set_version_file stores the
-- client's SDK-derived public URL. versions.track_id kept in sync (junction stays
-- canonical).

create or replace function public.is_member_of_version(_version_id uuid)
  returns boolean language sql security definer set search_path = public, pg_temp stable
as $$
  select exists (
    select 1 from public.track_versions tv
    where tv.version_id = _version_id
      and public.is_member_of_track(tv.track_id)
  );
$$;

create or replace function public.create_version(
  _track_id     uuid,
  _name         text,
  _status       public.version_status,
  _release_date date default current_date
) returns table (version_id uuid, upload_path text)
  language plpgsql security definer set search_path = public, pg_temp
as $$
declare _vid uuid; _slug text; _tid uuid := _track_id;
begin
  if not public.is_member_of_track(_track_id) then
    raise exception 'not a member of this track''s artist' using errcode = '42501';
  end if;
  select slug into _slug from public.tracks where id = _track_id;
  insert into public.versions (name, status, release_date, track_id)
    values (_name, _status, _release_date, _track_id)
    returning id into _vid;
  -- A trigger auto-links track_versions from versions.track_id. Keep this
  -- idempotent (works with or without the trigger) and table-qualified so
  -- version_id is unambiguous against the OUT parameter of the same name.
  insert into public.track_versions (track_id, version_id)
  select _track_id, _vid
  where not exists (
    select 1 from public.track_versions tv
    where tv.track_id = _track_id and tv.version_id = _vid
  );
  version_id  := _vid;
  upload_path := _slug || '-' || _tid || '/' || _slug || '-' || _vid || '.m4a';
  return next;
end $$;

-- Client uploads to upload_path, then passes getPublicUrl(path).data.publicUrl here.
create or replace function public.set_version_file(_version_id uuid, _resource_url text)
  returns void language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_member_of_version(_version_id) then
    raise exception 'not a member of this version''s artist' using errcode = '42501';
  end if;
  update public.versions set resource_url = _resource_url where id = _version_id;
end $$;

create or replace function public.update_version(
  _version_id uuid, _name text, _status public.version_status, _release_date date
) returns public.versions
  language plpgsql security definer set search_path = public, pg_temp
as $$
declare _v public.versions;
begin
  if not public.is_member_of_version(_version_id) then
    raise exception 'not a member of this version''s artist' using errcode = '42501';
  end if;
  update public.versions set name=_name, status=_status, release_date=_release_date
    where id=_version_id returning * into _v;
  return _v;
end $$;

create or replace function public.delete_version(_version_id uuid)
  returns void language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_member_of_version(_version_id) then
    raise exception 'not a member of this version''s artist' using errcode = '42501';
  end if;
  delete from public.track_versions where version_id = _version_id;
  delete from public.versions where id = _version_id;
end $$;

revoke all on function
  public.create_version(uuid,text,public.version_status,date),
  public.set_version_file(uuid,text),
  public.update_version(uuid,text,public.version_status,date),
  public.delete_version(uuid)
  from public;
grant execute on function
  public.create_version(uuid,text,public.version_status,date),
  public.set_version_file(uuid,text),
  public.update_version(uuid,text,public.version_status,date),
  public.delete_version(uuid)
  to authenticated;
