-- Store each version's audio length so the client no longer has to sniff it by
-- loading every track's audio file in the browser (which flooded the album/home
-- pages with media requests: infinite spinners, device heat, stolen audio
-- sessions, and WebContent OOM crashes on iOS).
--
-- duration_seconds is written on upload by set_version_file (the finalize RPC,
-- called after the file lands in Storage) and backfilled for existing rows by
-- scripts/backfill-version-durations.mjs.

alter table public.versions
  add column if not exists duration_seconds real;

-- set_version_file gains an optional _duration. Drop the 2-arg signature first
-- so PostgREST doesn't see two overloads (calls without _duration would become
-- ambiguous). The default keeps it callable with just id + url, and coalesce
-- preserves an existing duration when a caller omits it.
drop function if exists public.set_version_file(uuid, text);

create or replace function public.set_version_file(
  _version_id   uuid,
  _resource_url text,
  _duration     real default null
) returns void
  language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_member_of_version(_version_id) then
    raise exception 'not a member of this version''s artist' using errcode = '42501';
  end if;
  update public.versions
    set resource_url     = _resource_url,
        duration_seconds = coalesce(_duration, duration_seconds)
    where id = _version_id;
end $$;

revoke all on function public.set_version_file(uuid, text, real) from public;
grant execute on function public.set_version_file(uuid, text, real) to authenticated;
