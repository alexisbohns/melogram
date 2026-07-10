-- Migration: create track_likes table for authenticated per-user likes.
--
-- The like aggregate surfaced by the `track_overview` view (like_count) counts
-- rows in this table. This migration is written to be idempotent so it can run
-- safely against a project where the table/policies already exist (created via
-- the Supabase dashboard in the app's previous incarnation).

create table if not exists public.track_likes (
    user_id    uuid not null references auth.users(id) on delete cascade,
    track_id   uuid not null references public.tracks(id) on delete cascade,
    created_at timestamptz not null default now(),

    primary key (user_id, track_id)
);

-- Query the most-recently-liked tracks per user (used by the /likes page).
create index if not exists track_likes_user_created_idx
    on public.track_likes (user_id, created_at desc);

-- Aggregate like counts per track (used by the track_overview view).
create index if not exists track_likes_track_id_idx
    on public.track_likes (track_id);

-- Row-level security: a user may only see and change their own likes.
alter table public.track_likes enable row level security;

drop policy if exists "Users can read their own likes" on public.track_likes;
create policy "Users can read their own likes"
    on public.track_likes for select
    using (auth.uid() = user_id);

drop policy if exists "Users can insert their own likes" on public.track_likes;
create policy "Users can insert their own likes"
    on public.track_likes for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own likes" on public.track_likes;
create policy "Users can delete their own likes"
    on public.track_likes for delete
    using (auth.uid() = user_id);
