-- Migration: create track_plays table for listening analytics
--
-- GDPR note:
--   - user_id links a play to an authenticated Supabase user.
--   - anonymous_id is a randomly generated UUID stored in the browser's
--     localStorage (never linked to PII). It is NULL for authenticated plays.
--   - No IP addresses or fingerprinting data are stored.
--   - Users can request deletion of their data (by user_id for authenticated
--     users, or by clearing their localStorage anonymous_id for anonymous ones).

create table if not exists public.track_plays (
    id           uuid primary key default gen_random_uuid(),
    track_id     uuid not null references public.tracks(id) on delete cascade,
    user_id      uuid references auth.users(id) on delete set null,
    anonymous_id uuid,
    source       text,
    created_at   timestamptz not null default now(),

    -- Either user_id or anonymous_id must be set, never both.
    constraint track_plays_identity_check check (
        (user_id is not null and anonymous_id is null)
        or
        (user_id is null and anonymous_id is not null)
    )
);

-- Indexes for common query patterns
create index if not exists track_plays_track_id_idx    on public.track_plays (track_id);
create index if not exists track_plays_user_id_idx     on public.track_plays (user_id);
create index if not exists track_plays_anonymous_id_idx on public.track_plays (anonymous_id);
create index if not exists track_plays_created_at_idx  on public.track_plays (created_at desc);

-- Row-level security
alter table public.track_plays enable row level security;

-- Allow any client (anon or authenticated) to insert plays.
create policy "Anyone can insert track plays"
    on public.track_plays for insert
    with check (true);

-- Only the owning user can read their own plays; anonymous plays are not
-- readable by clients (admin/service-role access only).
create policy "Users can read their own plays"
    on public.track_plays for select
    using (auth.uid() = user_id);
