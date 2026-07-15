-- Aggregate play counts per track, readable by anon + authenticated clients.
--
-- public.track_plays is locked down by RLS (a client may only read its own
-- rows), so the raw table can't power a public "most played" ranking. This
-- view aggregates it and — like the like_count aggregate exposed on the
-- track_overview view — runs with the view owner's rights (security_invoker
-- off), so it surfaces only per-track totals, never individual play rows,
-- anonymous ids, or any other PII.
--
-- Powers the home "Popular" tab: popularity = like_count * 10 + play_count / 10.
create or replace view public.track_play_counts
  with (security_invoker = off) as
  select track_id, count(*)::bigint as play_count
  from public.track_plays
  group by track_id;

grant select on public.track_play_counts to anon, authenticated;
