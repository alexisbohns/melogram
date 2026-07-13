-- Records a listening event into public.track_plays.
--
-- The rewrite to Next.js dropped the old play-recording code (an API route that
-- inserted via the service role); playback is anonymous and the app has no
-- service-role key. This SECURITY DEFINER RPC lets both anonymous and
-- authenticated clients record a play without loosening the table's RLS — the
-- same pattern the content-editing RPCs use. is_artist_member is likewise
-- granted to anon (see 20260712000100_artist_members.sql).
--
-- For authenticated callers the play is attributed to auth.uid() and the passed
-- _anonymous_id is ignored; otherwise it is attributed to _anonymous_id (a
-- random UUID kept in the browser's localStorage). This satisfies the table's
-- XOR track_plays_identity_check. A 10-second per-identity rate limit mirrors
-- the cooldown the old /api/track-plays route enforced.
create or replace function public.record_play(
  _track_id     uuid,
  _anonymous_id uuid default null,
  _source       text default null
) returns void
  language plpgsql security definer set search_path = public, pg_temp
as $$
declare _uid uuid := auth.uid();
begin
  -- Ignore plays for tracks that don't exist (also satisfies the FK).
  if not exists (select 1 from public.tracks where id = _track_id) then
    return;
  end if;

  if _uid is not null then
    -- Authenticated play. Skip if this user already logged this track recently.
    if exists (
      select 1 from public.track_plays
      where track_id = _track_id
        and user_id = _uid
        and created_at > now() - interval '10 seconds'
    ) then
      return;
    end if;
    insert into public.track_plays (track_id, user_id, source)
      values (_track_id, _uid, _source);
  else
    -- Anonymous play. Requires an anonymous id to attribute the row.
    if _anonymous_id is null then
      return;
    end if;
    if exists (
      select 1 from public.track_plays
      where track_id = _track_id
        and anonymous_id = _anonymous_id
        and created_at > now() - interval '10 seconds'
    ) then
      return;
    end if;
    insert into public.track_plays (track_id, anonymous_id, source)
      values (_track_id, _anonymous_id, _source);
  end if;
end $$;

revoke all on function public.record_play(uuid, uuid, text) from public;
grant execute on function public.record_play(uuid, uuid, text) to anon, authenticated;
