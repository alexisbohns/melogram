-- Deterministic Storage path for an EXISTING version, so audio can be attached
-- to a fileless version or replaced later. Mirrors create_version's path
-- expression. Resolves the track via versions.track_id with a track_versions
-- fallback for legacy rows created before the denormalized column.

create or replace function public.version_upload_path(_version_id uuid)
  returns text
  language plpgsql security definer set search_path = public, pg_temp
as $$
declare _path text;
begin
  if not public.is_member_of_version(_version_id) then
    raise exception 'not a member of this version''s artist' using errcode = '42501';
  end if;
  select t.slug || '-' || t.id || '/' || t.slug || '-' || v.id || '.m4a'
    into _path
    from public.versions v
    join public.tracks t on t.id = coalesce(
      v.track_id,
      (select tv.track_id from public.track_versions tv
         where tv.version_id = v.id
         order by tv.created_at
         limit 1)
    )
    where v.id = _version_id;
  if _path is null then
    raise exception 'version % has no linked track', _version_id;
  end if;
  return _path;
end $$;

revoke all on function public.version_upload_path(uuid) from public;
grant execute on function public.version_upload_path(uuid) to authenticated;
