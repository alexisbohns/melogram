-- Roles layer: which users may manage which artist, plus the membership guard
-- every content RPC calls first.

create table if not exists public.artist_members (
  artist_id  uuid not null references public.artists(id) on delete cascade,
  user_id    uuid not null references auth.users(id)     on delete cascade,
  role       text not null check (role in ('owner','maintainer')),
  created_at timestamptz not null default now(),
  primary key (artist_id, user_id)
);

alter table public.artist_members enable row level security;

-- A member may read their own membership rows (enough to compute canEdit). This
-- is intentionally non-recursive: a policy that sub-queries artist_members would
-- trigger "infinite recursion detected in policy". No client writes: memberships
-- are seeded manually in the dashboard for now.
drop policy if exists "members read own artist memberships" on public.artist_members;
create policy "members read own artist memberships"
  on public.artist_members for select
  using (user_id = auth.uid());

-- SECURITY DEFINER so it can read artist_members regardless of the caller's RLS.
create or replace function public.is_artist_member(_artist_id uuid)
  returns boolean
  language sql
  security definer
  set search_path = public, pg_temp
  stable
as $$
  select exists (
    select 1 from public.artist_members m
    where m.artist_id = _artist_id
      and m.user_id = auth.uid()
  );
$$;

revoke all on function public.is_artist_member(uuid) from public;
grant execute on function public.is_artist_member(uuid) to anon, authenticated;
