-- Store each version's waveform so the client no longer has to download and
-- decode the audio to draw one. Same reasoning as duration_seconds (see
-- 20260712001200_version_duration.sql): sniffing audio in the browser flooded
-- pages with media requests — infinite spinners, device heat, stolen audio
-- sessions, and iOS WebContent OOM crashes. A track page that decoded its song
-- just to paint a waveform would walk straight back into it.
--
-- 512 absolute-value buckets, normalized 0..1 — enough resolution for any width
-- the app renders, a few KB per version. Written on upload by set_version_file
-- and backfilled for existing rows by scripts/backfill-version-waveforms.mjs.

alter table public.versions
  add column if not exists waveform_peaks real[];

-- set_version_file gains an optional _peaks. Drop the 3-arg signature first so
-- PostgREST doesn't see two overloads (calls without _peaks would become
-- ambiguous) — the same hazard this function already hit when _duration was
-- added. coalesce preserves existing peaks when a caller omits them.
drop function if exists public.set_version_file(uuid, text, real);

create or replace function public.set_version_file(
  _version_id   uuid,
  _resource_url text,
  _duration     real default null,
  _peaks        real[] default null
) returns void
  language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_member_of_version(_version_id) then
    raise exception 'not a member of this version''s artist' using errcode = '42501';
  end if;
  update public.versions
    set resource_url     = _resource_url,
        duration_seconds = coalesce(_duration, duration_seconds),
        waveform_peaks   = coalesce(_peaks, waveform_peaks)
    where id = _version_id;
end $$;

revoke all on function public.set_version_file(uuid, text, real, real[]) from public;
grant execute on function public.set_version_file(uuid, text, real, real[]) to authenticated;
