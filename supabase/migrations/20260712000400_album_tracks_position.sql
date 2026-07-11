-- Explicit setlist order within an album. Backfill from insertion order.

alter table public.album_tracks
  add column if not exists position int;

with ordered as (
  select id,
         row_number() over (partition by album_id order by created_at, id) as rn
  from public.album_tracks
)
update public.album_tracks at
  set position = ordered.rn
  from ordered
  where ordered.id = at.id
    and at.position is null;
