# Artist Content API Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the database foundation for artist content management — a roles layer, genre vocabulary, setlist ordering, and a full set of `SECURITY DEFINER` RPCs that let a member CRUD albums, tracks, and versions (and their Storage files) in single authorized calls.

**Architecture:** All writes go through Postgres `SECURITY DEFINER` functions that check `artist_members` membership *before* touching data; the content tables keep RLS on with public read and **no** client write policies, so the RPCs are the only write path. Files upload directly to Storage from the client (authorized by Storage RLS on the same membership); the client passes the SDK-derived public URL back to a finalize RPC. No service-role key is used anywhere.

**Tech Stack:** Supabase Postgres (RLS, PL/pgSQL, enums, generated columns), Supabase Storage, Supabase CLI v2.84.2. This plan is the backend/API layer only — the inline edit UI is Plan 2.

**Spec:** `docs/superpowers/specs/2026-07-12-artist-content-management-design.md`

---

## Conventions for every task

**Applying a migration.** Migration files live in `supabase/migrations/`. Apply each by either:
- pasting its contents into the Supabase **dashboard SQL editor** and running it, or
- `supabase link --project-ref <your-ref>` (once) then `supabase db push`.

There is **no dev project** — migrations apply to prod. Every migration in this plan is **additive** (new tables, columns, functions, policies) and touches no existing rows except explicit, reviewed backfills. Review each migration before applying.

**Verifying a task (no test framework).** Each task ships a verification block that is a single self-contained PL/pgSQL `DO` block wrapped in `begin; … rollback;`. Run it in the Supabase SQL editor. The pattern:

- The `DO` block declares its own variables, seeds throwaway fixtures, and asserts — everything server-side, so there are no psql `\gset` / `:var` gymnastics (psql does **not** interpolate variables inside dollar-quoted blocks).
- It picks a real user to impersonate with `select id into _uid from auth.users limit 1;` (nothing to paste), and switches identity by setting the JWT claim: `perform set_config('request.jwt.claims', json_build_object('sub', _uid, 'role','authenticated')::text, true);`. The RPCs read `auth.uid()` from that claim; because they are `SECURITY DEFINER` they bypass table RLS, so no `SET ROLE` is needed to exercise their authorization logic.
- Assertions use PL/pgSQL `assert <cond>, '<msg>'` — a failure aborts the block loudly. Negative ("should be rejected") checks wrap the call in `begin … exception when insufficient_privilege then null; end;`.
- The surrounding `begin; … rollback;` discards every fixture, so **nothing persists to prod**. A passing block prints `NOTICE: Task N verification passed`.

**"Expected to fail first."** Before applying a task's migration, run its verification block — it must fail (missing table/function). That is the red state. Apply the migration, re-run, it goes green. Then commit.

**Commit style.** One commit per task: `git add supabase/migrations/<file> && git commit -m "<msg>"`.

---

## Task 1: Roles foundation — `artist_members` + `is_artist_member` guard

**Files:**
- Create: `supabase/migrations/20260712000100_artist_members.sql`

- [ ] **Step 1: Write the verification block** (save nowhere — run it in the SQL editor; expect failure now)

```sql
begin;
do $$
declare _uid uuid; _artist uuid;
begin
  select id into _uid from auth.users limit 1;
  assert _uid is not null, 'need at least one auth user to impersonate';
  insert into public.artists (name) values ('Verify Artist') returning id into _artist;
  insert into public.artist_members (artist_id, user_id, role) values (_artist, _uid, 'owner');

  perform set_config('request.jwt.claims',
    json_build_object('sub', _uid, 'role','authenticated')::text, true);

  assert public.is_artist_member(_artist), 'seeded owner should be a member';
  assert not public.is_artist_member(gen_random_uuid()), 'random artist id should not be a member';
  raise notice 'Task 1 verification passed';
end $$;
rollback;
```

- [ ] **Step 2: Run it — expect failure**

Expected: `ERROR: relation "public.artist_members" does not exist` (or missing function). This is the red state.

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/20260712000100_artist_members.sql
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
```

- [ ] **Step 4: Apply the migration** (dashboard SQL editor or `supabase db push`).

- [ ] **Step 5: Re-run the verification block — expect success**

Expected: no assertion errors; the `do` block completes silently, then `ROLLBACK`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260712000100_artist_members.sql
git commit -m "feat(db): add artist_members roles table and is_artist_member guard"
```

---

## Task 2: Genre vocabulary — `genres` + `album_genres` + `slugify`

**Files:**
- Create: `supabase/migrations/20260712000200_genres.sql`

- [ ] **Step 1: Write the verification block** (run now; expect failure)

```sql
begin;
do $$
declare _slug text;
begin
  insert into public.genres (name) values ('Synth Wave');
  select slug into _slug from public.genres where name = 'Synth Wave';
  assert _slug = 'synth-wave', 'slug should be a full slugified name (got: ' || coalesce(_slug,'<null>') || ')';
  raise notice 'Task 2 verification passed';
end $$;
rollback;
```

- [ ] **Step 2: Run it — expect failure**

Expected: `ERROR: relation "public.genres" does not exist`.

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/20260712000200_genres.sql
-- Controlled genre vocabulary (searchable combobox source) + album links.

-- Full slug helper (genres appear in URLs/filters, not storage paths, so unlike
-- track/artist 3-char slugs this is a real slug).
create or replace function public.slugify(_text text)
  returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(coalesce(_text,'')), '[^a-z0-9]+', '-', 'g'));
$$;

create table if not exists public.genres (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text not null default '',
  created_at timestamptz not null default now()
);

-- Keep slug in sync with name via trigger (a plain default can't reference name
-- reliably across updates).
create or replace function public.genres_set_slug()
  returns trigger language plpgsql as $$
begin
  new.slug := public.slugify(new.name);
  return new;
end $$;

drop trigger if exists genres_slug on public.genres;
create trigger genres_slug before insert or update of name on public.genres
  for each row execute function public.genres_set_slug();

create table if not exists public.album_genres (
  album_id uuid not null references public.albums(id) on delete cascade,
  genre_id uuid not null references public.genres(id) on delete cascade,
  primary key (album_id, genre_id)
);

alter table public.genres       enable row level security;
alter table public.album_genres enable row level security;

drop policy if exists "public read genres" on public.genres;
create policy "public read genres" on public.genres for select using (true);

drop policy if exists "public read album_genres" on public.album_genres;
create policy "public read album_genres" on public.album_genres for select using (true);
```

- [ ] **Step 4: Apply the migration.**

- [ ] **Step 5: Re-run the verification block — expect success** (asserts pass; `synth-wave` slug produced).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260712000200_genres.sql
git commit -m "feat(db): add genres and album_genres with slugify"
```

---

## Task 3: Link albums to artists — `albums.artist_id` + backfill

**Files:**
- Create: `supabase/migrations/20260712000300_albums_artist_id.sql`

**Precondition:** exactly one artist exists today (`bohns`). Confirm with `select id, name from public.artists;` and adjust the backfill's `name` filter if yours differs.

- [ ] **Step 1: Write the verification block** (run now; expect failure — column missing)

```sql
do $$ begin
  assert (select count(*) from public.albums where artist_id is null) = 0,
    'every album should have an artist_id after backfill';
  assert (select count(distinct artist_id) from public.albums) >= 1,
    'albums point at a real artist';
end $$;
```

- [ ] **Step 2: Run it — expect failure**

Expected: `ERROR: column "artist_id" does not exist`.

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/20260712000300_albums_artist_id.sql
-- Associate every album with an artist. Backfill existing albums to bohns.

alter table public.albums
  add column if not exists artist_id uuid references public.artists(id);

update public.albums
  set artist_id = (select id from public.artists where lower(name) = 'bohns' limit 1)
  where artist_id is null;
```

- [ ] **Step 4: Apply the migration.**

- [ ] **Step 5: Re-run the verification block — expect success** (no null `artist_id`).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260712000300_albums_artist_id.sql
git commit -m "feat(db): add albums.artist_id and backfill to bohns"
```

---

## Task 4: Setlist ordering — `album_tracks.position` + backfill

**Files:**
- Create: `supabase/migrations/20260712000400_album_tracks_position.sql`

- [ ] **Step 1: Write the verification block** (run now; expect failure — column missing)

```sql
-- For each album, positions must be 1..N with no gaps or dupes.
do $$
declare bad int;
begin
  select count(*) into bad from (
    select album_id,
           count(*)                          as n,
           min(position)                      as lo,
           max(position)                      as hi,
           count(distinct position)           as distinct_n
    from public.album_tracks
    where album_id is not null
    group by album_id
    having min(position) <> 1
        or max(position) <> count(*)
        or count(distinct position) <> count(*)
  ) t;
  assert bad = 0, 'each album should have contiguous 1..N positions';
end $$;
```

- [ ] **Step 2: Run it — expect failure**

Expected: `ERROR: column "position" does not exist`.

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/20260712000400_album_tracks_position.sql
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
```

- [ ] **Step 4: Apply the migration.**

- [ ] **Step 5: Re-run the verification block — expect success** (contiguous positions per album).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260712000400_album_tracks_position.sql
git commit -m "feat(db): add album_tracks.position for setlist order + backfill"
```

---

## Task 5: Write lockdown — public read stays, no client writes

RLS is already enabled on the content tables and they are publicly readable. This task **guarantees** the lockdown invariant: the only content-table SELECT policies are public, and there are **no** INSERT/UPDATE/DELETE policies for `anon`/`authenticated` (so the `SECURITY DEFINER` RPCs are the sole write path).

**Files:**
- Create: `supabase/migrations/20260712000500_content_read_policies.sql`

- [ ] **Step 1: Write the verification block** (run now — the anon-read asserts may already pass; the "no write policy" assert is the meaningful one and should hold after the migration)

```sql
-- 1) No write policies for client roles on content tables.
do $$
declare bad int;
begin
  select count(*) into bad
  from pg_policies
  where schemaname = 'public'
    and tablename in ('albums','tracks','versions','album_tracks','track_versions','album_genres')
    and cmd in ('INSERT','UPDATE','DELETE');
  assert bad = 0, 'content tables must have no client INSERT/UPDATE/DELETE policies (found ' || bad || ')';
  raise notice 'no client write policies: ok';
end $$;

-- 2) A direct client-role INSERT must be blocked by RLS. Run this separately;
--    the EXPECTED result is an ERROR (new row violates row-level security policy).
begin;
  set local role authenticated;
  insert into public.albums (name, type) values ('should-fail', 'album');
  reset role;
rollback;
```

- [ ] **Step 2: Run it — note current state**

If the "no write policies" assert fails, an unexpected write policy exists — inspect with `select * from pg_policies where tablename='albums';` and fold a matching `drop policy` into Step 3.

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/20260712000500_content_read_policies.sql
-- Ensure public read on artists + content, and (idempotently) that RLS is on.
-- Writes are intentionally NOT granted to client roles; SECURITY DEFINER RPCs
-- (Tasks 6-9) are the only write path.

alter table public.artists      enable row level security;
alter table public.albums       enable row level security;
alter table public.tracks       enable row level security;
alter table public.versions     enable row level security;
alter table public.album_tracks enable row level security;
alter table public.track_versions enable row level security;

drop policy if exists "public read artists" on public.artists;
create policy "public read artists" on public.artists for select using (true);

drop policy if exists "public read albums" on public.albums;
create policy "public read albums" on public.albums for select using (true);

drop policy if exists "public read tracks" on public.tracks;
create policy "public read tracks" on public.tracks for select using (true);

drop policy if exists "public read versions" on public.versions;
create policy "public read versions" on public.versions for select using (true);

drop policy if exists "public read album_tracks" on public.album_tracks;
create policy "public read album_tracks" on public.album_tracks for select using (true);

drop policy if exists "public read track_versions" on public.track_versions;
create policy "public read track_versions" on public.track_versions for select using (true);
```

- [ ] **Step 4: Apply the migration.**

- [ ] **Step 5: Re-run the verification block — expect success** (both asserts pass).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260712000500_content_read_policies.sql
git commit -m "feat(db): lock content writes to RPCs, ensure public read policies"
```

---

## Task 6: Album RPCs — create / update / delete / genres / cover

**Files:**
- Create: `supabase/migrations/20260712000600_rpc_albums.sql`

- [ ] **Step 1: Write the verification block** (run now; expect failure — functions missing)

```sql
begin;
do $$
declare
  _uid uuid; _outsider uuid := gen_random_uuid();
  _artist uuid; _gid uuid; _album uuid;
begin
  select id into _uid from auth.users limit 1;
  assert _uid is not null, 'need an auth user to impersonate';
  insert into public.artists (name) values ('RPC Album Artist') returning id into _artist;
  insert into public.artist_members (artist_id, user_id, role) values (_artist, _uid, 'owner');
  insert into public.genres (name) values ('Verify Genre ' || _artist) returning id into _gid;

  perform set_config('request.jwt.claims',
    json_build_object('sub', _uid, 'role','authenticated')::text, true);

  -- create with a genre
  _album := (public.create_album(_artist, 'My Album', 'album', 'desc', array[_gid])).id;
  assert (select artist_id from public.albums where id = _album) = _artist, 'album belongs to the artist';
  assert exists (select 1 from public.album_genres where album_id = _album and genre_id = _gid), 'genre linked on create';

  -- update
  perform public.update_album(_album, 'Renamed', 'new desc', 'ep');
  assert (select name from public.albums where id = _album) = 'Renamed', 'name updated';
  assert (select type::text from public.albums where id = _album) = 'ep', 'type updated';

  -- cover + genres setters
  perform public.set_album_cover(_album, 'https://example.test/cover.jpg');
  assert (select cover_url from public.albums where id = _album) = 'https://example.test/cover.jpg', 'cover set';
  perform public.set_album_genres(_album, '{}'::uuid[]);
  assert not exists (select 1 from public.album_genres where album_id = _album), 'genres replaced with empty';

  -- non-member is rejected
  perform set_config('request.jwt.claims',
    json_build_object('sub', _outsider, 'role','authenticated')::text, true);
  begin
    perform public.update_album(_album, 'Hacked', 'x', 'single');
    assert false, 'non-member update should have raised';
  exception when insufficient_privilege then null;
  end;

  raise notice 'Task 6 verification passed';
end $$;
rollback;
```

- [ ] **Step 2: Run it — expect failure**

Expected: `ERROR: function public.create_album(...) does not exist`.

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/20260712000600_rpc_albums.sql
-- Album CRUD. Every function checks membership first and raises
-- insufficient_privilege (42501) for non-members. Album type enum is
-- public.album_type (values: single | ep | album).

-- Guard: caller is a member of the album's artist.
create or replace function public.is_member_of_album(_album_id uuid)
  returns boolean language sql security definer set search_path = public, pg_temp stable
as $$
  select public.is_artist_member((select artist_id from public.albums where id = _album_id));
$$;

create or replace function public.create_album(
  _artist_id   uuid,
  _name        text,
  _type        public.album_type,
  _description text default null,
  _genre_ids   uuid[] default '{}'
) returns public.albums
  language plpgsql security definer set search_path = public, pg_temp
as $$
declare _album public.albums;
begin
  if not public.is_artist_member(_artist_id) then
    raise exception 'not a member of artist %', _artist_id using errcode = '42501';
  end if;
  insert into public.albums (artist_id, name, type, description)
    values (_artist_id, _name, _type, _description)
    returning * into _album;
  if array_length(_genre_ids, 1) is not null then
    insert into public.album_genres (album_id, genre_id)
      select _album.id, g from unnest(_genre_ids) g
      on conflict do nothing;
  end if;
  return _album;
end $$;

create or replace function public.update_album(
  _album_id    uuid,
  _name        text,
  _description text,
  _type        public.album_type
) returns public.albums
  language plpgsql security definer set search_path = public, pg_temp
as $$
declare _album public.albums;
begin
  if not public.is_member_of_album(_album_id) then
    raise exception 'not a member of this album''s artist' using errcode = '42501';
  end if;
  update public.albums
    set name = _name, description = _description, type = _type
    where id = _album_id
    returning * into _album;
  return _album;
end $$;

create or replace function public.delete_album(_album_id uuid)
  returns void language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_member_of_album(_album_id) then
    raise exception 'not a member of this album''s artist' using errcode = '42501';
  end if;
  delete from public.albums where id = _album_id;
end $$;

create or replace function public.set_album_genres(_album_id uuid, _genre_ids uuid[])
  returns void language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_member_of_album(_album_id) then
    raise exception 'not a member of this album''s artist' using errcode = '42501';
  end if;
  delete from public.album_genres where album_id = _album_id;
  if array_length(_genre_ids, 1) is not null then
    insert into public.album_genres (album_id, genre_id)
      select _album_id, g from unnest(_genre_ids) g
      on conflict do nothing;
  end if;
end $$;

-- Client uploads the cover to Storage, then passes the SDK getPublicUrl() result
-- here (machine-written, never hand-typed).
create or replace function public.set_album_cover(_album_id uuid, _cover_url text)
  returns void language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_member_of_album(_album_id) then
    raise exception 'not a member of this album''s artist' using errcode = '42501';
  end if;
  update public.albums set cover_url = _cover_url where id = _album_id;
end $$;

revoke all on function
  public.create_album(uuid,text,public.album_type,text,uuid[]),
  public.update_album(uuid,text,text,public.album_type),
  public.delete_album(uuid),
  public.set_album_genres(uuid,uuid[]),
  public.set_album_cover(uuid,text)
  from public;
grant execute on function
  public.create_album(uuid,text,public.album_type,text,uuid[]),
  public.update_album(uuid,text,text,public.album_type),
  public.delete_album(uuid),
  public.set_album_genres(uuid,uuid[]),
  public.set_album_cover(uuid,text)
  to authenticated;
```

- [ ] **Step 4: Apply the migration.**

- [ ] **Step 5: Re-run the verification block — expect success** (member path asserts pass; non-member raises `insufficient_privilege`, caught).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260712000600_rpc_albums.sql
git commit -m "feat(db): album CRUD RPCs (create/update/delete/genres/cover)"
```

---

## Task 7: Track RPCs — create / update / remove / delete / reorder setlist

**Files:**
- Create: `supabase/migrations/20260712000700_rpc_tracks.sql`

- [ ] **Step 1: Write the verification block** (run now; expect failure)

```sql
begin;
do $$
declare
  _uid uuid; _outsider uuid := gen_random_uuid();
  _artist uuid; _album uuid; _t1 uuid; _t2 uuid;
begin
  select id into _uid from auth.users limit 1;
  assert _uid is not null, 'need an auth user to impersonate';
  insert into public.artists (name) values ('RPC Track Artist') returning id into _artist;
  insert into public.artist_members (artist_id, user_id, role) values (_artist, _uid, 'owner');
  perform set_config('request.jwt.claims',
    json_build_object('sub', _uid, 'role','authenticated')::text, true);

  _album := (public.create_album(_artist, 'Setlist Album', 'album', null, '{}')).id;
  _t1 := (public.create_track(_album, 'Track One', null, null)).id;
  _t2 := (public.create_track(_album, 'Track Two', null, null)).id;
  assert (select position from public.album_tracks where album_id=_album and track_id=_t1) = 1, 't1 at position 1';
  assert (select position from public.album_tracks where album_id=_album and track_id=_t2) = 2, 't2 at position 2';

  -- reorder: t2 before t1
  perform public.reorder_setlist(_album, array[_t2, _t1]);
  assert (select position from public.album_tracks where album_id=_album and track_id=_t2) = 1, 't2 now first';
  assert (select position from public.album_tracks where album_id=_album and track_id=_t1) = 2, 't1 now second';

  -- remove t1 from album (track row survives, link gone)
  perform public.remove_track_from_album(_album, _t1);
  assert not exists (select 1 from public.album_tracks where album_id=_album and track_id=_t1), 'link removed';
  assert exists (select 1 from public.tracks where id=_t1), 'track row survives';

  -- delete t2 entirely
  perform public.delete_track(_t2);
  assert not exists (select 1 from public.tracks where id=_t2), 'track deleted';

  -- non-member rejected
  perform set_config('request.jwt.claims',
    json_build_object('sub', _outsider, 'role','authenticated')::text, true);
  begin
    perform public.create_track(_album, 'Hack', null, null);
    assert false, 'non-member create_track should raise';
  exception when insufficient_privilege then null;
  end;

  raise notice 'Task 7 verification passed';
end $$;
rollback;
```

- [ ] **Step 2: Run it — expect failure** (`function public.create_track(...) does not exist`).

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/20260712000700_rpc_tracks.sql
-- Track CRUD + setlist ordering. create_track inserts the track AND the
-- album_tracks link at the next position in one call.

-- Guard: caller is a member of any artist that owns an album this track is on.
create or replace function public.is_member_of_track(_track_id uuid)
  returns boolean language sql security definer set search_path = public, pg_temp stable
as $$
  select exists (
    select 1
    from public.album_tracks at
    join public.albums a on a.id = at.album_id
    where at.track_id = _track_id
      and public.is_artist_member(a.artist_id)
  );
$$;

create or replace function public.create_track(
  _album_id    uuid,
  _name        text,
  _description text default null,
  _lyrics      text default null
) returns public.tracks
  language plpgsql security definer set search_path = public, pg_temp
as $$
declare _track public.tracks; _next int;
begin
  if not public.is_member_of_album(_album_id) then
    raise exception 'not a member of this album''s artist' using errcode = '42501';
  end if;
  insert into public.tracks (name, description, lyrics)
    values (_name, _description, _lyrics)
    returning * into _track;
  select coalesce(max(position), 0) + 1 into _next
    from public.album_tracks where album_id = _album_id;
  insert into public.album_tracks (album_id, track_id, position)
    values (_album_id, _track.id, _next);
  return _track;
end $$;

create or replace function public.update_track(
  _track_id uuid, _name text, _description text, _lyrics text
) returns public.tracks
  language plpgsql security definer set search_path = public, pg_temp
as $$
declare _track public.tracks;
begin
  if not public.is_member_of_track(_track_id) then
    raise exception 'not a member of this track''s artist' using errcode = '42501';
  end if;
  update public.tracks set name=_name, description=_description, lyrics=_lyrics
    where id=_track_id returning * into _track;
  return _track;
end $$;

-- Unlink a track from one album (renumber remaining positions), keep the track row.
create or replace function public.remove_track_from_album(_album_id uuid, _track_id uuid)
  returns void language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_member_of_album(_album_id) then
    raise exception 'not a member of this album''s artist' using errcode = '42501';
  end if;
  delete from public.album_tracks where album_id=_album_id and track_id=_track_id;
  with ordered as (
    select id, row_number() over (order by position, id) as rn
    from public.album_tracks where album_id=_album_id
  )
  update public.album_tracks at set position = ordered.rn
    from ordered where ordered.id = at.id;
end $$;

-- Delete a track everywhere: its album links, its version links, and its
-- now-orphaned versions. (Version files are cleaned up client-side.)
create or replace function public.delete_track(_track_id uuid)
  returns void language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_member_of_track(_track_id) then
    raise exception 'not a member of this track''s artist' using errcode = '42501';
  end if;
  delete from public.versions v
    using public.track_versions tv
    where tv.version_id = v.id and tv.track_id = _track_id;
  delete from public.track_versions where track_id = _track_id;
  delete from public.album_tracks where track_id = _track_id;
  delete from public.tracks where id = _track_id;
end $$;

-- Reorder a whole album's setlist from an ordered array of track ids.
create or replace function public.reorder_setlist(_album_id uuid, _ordered_track_ids uuid[])
  returns void language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_member_of_album(_album_id) then
    raise exception 'not a member of this album''s artist' using errcode = '42501';
  end if;
  update public.album_tracks at
    set position = ord.rn
    from (select id, ordinality::int as rn
          from unnest(_ordered_track_ids) with ordinality as u(id, ordinality)) ord
    where at.album_id = _album_id and at.track_id = ord.id;
end $$;

revoke all on function
  public.create_track(uuid,text,text,text),
  public.update_track(uuid,text,text,text),
  public.remove_track_from_album(uuid,uuid),
  public.delete_track(uuid),
  public.reorder_setlist(uuid,uuid[])
  from public;
grant execute on function
  public.create_track(uuid,text,text,text),
  public.update_track(uuid,text,text,text),
  public.remove_track_from_album(uuid,uuid),
  public.delete_track(uuid),
  public.reorder_setlist(uuid,uuid[])
  to authenticated;
```

- [ ] **Step 4: Apply the migration.**

- [ ] **Step 5: Re-run the verification block — expect success.**

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260712000700_rpc_tracks.sql
git commit -m "feat(db): track CRUD + reorder_setlist RPCs"
```

---

## Task 8: Version RPCs — create (returns upload path) / finalize / update / delete

The `create_version` function returns the new id **and** the deterministic storage
path `{track.slug}-{track.id}/{track.slug}-{version.id}.m4a` (the file reuses the
track's slug; versions have no slug of their own). The client uploads to that path,
then calls `set_version_file` with the SDK-derived public URL.

**Files:**
- Create: `supabase/migrations/20260712000800_rpc_versions.sql`

- [ ] **Step 1: Write the verification block** (run now; expect failure)

```sql
begin;
do $$
declare
  _uid uuid; _outsider uuid := gen_random_uuid();
  _artist uuid; _album uuid; _tid uuid; _slug text;
  _vid uuid; _path text; _expected text;
begin
  select id into _uid from auth.users limit 1;
  assert _uid is not null, 'need an auth user to impersonate';
  insert into public.artists (name) values ('RPC Version Artist') returning id into _artist;
  insert into public.artist_members (artist_id, user_id, role) values (_artist, _uid, 'owner');
  perform set_config('request.jwt.claims',
    json_build_object('sub', _uid, 'role','authenticated')::text, true);

  _album := (public.create_album(_artist, 'V Album', 'album', null, '{}')).id;
  _tid := (public.create_track(_album, 'Night Drive', null, null)).id;
  select slug into _slug from public.tracks where id = _tid;

  select version_id, upload_path into _vid, _path
    from public.create_version(_tid, 'First Mix', 'demo', current_date);
  _expected := _slug || '-' || _tid || '/' || _slug || '-' || _vid || '.m4a';

  assert exists (select 1 from public.versions where id = _vid), 'version row created';
  assert exists (select 1 from public.track_versions where track_id=_tid and version_id=_vid), 'link created';
  assert (select track_id from public.versions where id=_vid) = _tid, 'versions.track_id kept in sync';
  assert _path = _expected, 'upload_path follows {track.slug}-{track.id}/{track.slug}-{version.id}.m4a (got ' || _path || ')';

  perform public.set_version_file(_vid, 'https://example.test/songs/x.m4a');
  assert (select resource_url from public.versions where id=_vid) = 'https://example.test/songs/x.m4a', 'resource_url written';

  perform public.update_version(_vid, 'First Mix', 'final', current_date);
  assert (select status::text from public.versions where id=_vid) = 'final', 'status updated';

  perform public.delete_version(_vid);
  assert not exists (select 1 from public.versions where id=_vid), 'version deleted';
  assert not exists (select 1 from public.track_versions where version_id=_vid), 'link deleted';

  -- non-member rejected
  perform set_config('request.jwt.claims',
    json_build_object('sub', _outsider, 'role','authenticated')::text, true);
  begin
    perform public.create_version(_tid, 'Hack', 'raw', current_date);
    assert false, 'non-member create_version should raise';
  exception when insufficient_privilege then null;
  end;

  raise notice 'Task 8 verification passed';
end $$;
rollback;
```

- [ ] **Step 2: Run it — expect failure** (`function public.create_version(...) does not exist`).

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/20260712000800_rpc_versions.sql
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
```

- [ ] **Step 4: Apply the migration.**

- [ ] **Step 5: Re-run the verification block — expect success** (path format asserts pass; non-member rejected).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260712000800_rpc_versions.sql
git commit -m "feat(db): version RPCs with deterministic upload path"
```

---

## Task 9: Genre creation RPC

Listing genres is a plain public SELECT (no RPC). Creating one is open to any member so the combobox vocabulary can grow.

**Files:**
- Create: `supabase/migrations/20260712000900_rpc_genres.sql`

- [ ] **Step 1: Write the verification block** (run now; expect failure)

```sql
begin;
do $$
declare _uid uuid; _artist uuid; _gid uuid; _slug text;
begin
  select id into _uid from auth.users limit 1;
  assert _uid is not null, 'need an auth user to impersonate';
  insert into public.artists (name) values ('Genre RPC Artist') returning id into _artist;
  insert into public.artist_members (artist_id, user_id, role) values (_artist, _uid, 'owner');

  perform set_config('request.jwt.claims',
    json_build_object('sub', _uid, 'role','authenticated')::text, true);
  _gid := (public.create_genre('Dream Pop')).id;
  select slug into _slug from public.genres where id = _gid;
  assert _slug = 'dream-pop', 'genre slug generated (got ' || coalesce(_slug,'<null>') || ')';

  -- a non-member (random uid, not in artist_members) may not create genres
  perform set_config('request.jwt.claims',
    json_build_object('sub', gen_random_uuid(), 'role','authenticated')::text, true);
  begin
    perform public.create_genre('Should Fail');
    assert false, 'non-member create_genre should raise';
  exception when insufficient_privilege then null;
  end;

  raise notice 'Task 9 verification passed';
end $$;
rollback;
```

- [ ] **Step 2: Run it — expect failure** (`function public.create_genre(text) does not exist`).

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/20260712000900_rpc_genres.sql
-- Any authenticated artist_member may extend the genre vocabulary.

create or replace function public.create_genre(_name text)
  returns public.genres
  language plpgsql security definer set search_path = public, pg_temp
as $$
declare _g public.genres;
begin
  if not exists (select 1 from public.artist_members where user_id = auth.uid()) then
    raise exception 'only artist members may create genres' using errcode = '42501';
  end if;
  insert into public.genres (name) values (_name)
    on conflict (name) do update set name = excluded.name
    returning * into _g;
  return _g;
end $$;

revoke all on function public.create_genre(text) from public;
grant execute on function public.create_genre(text) to authenticated;
```

- [ ] **Step 4: Apply the migration.**

- [ ] **Step 5: Re-run the verification block — expect success** (member creates `dream-pop`; anon rejected).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260712000900_rpc_genres.sql
git commit -m "feat(db): create_genre RPC for members"
```

---

## Task 10: Storage buckets + write policies

Audio lives in the existing public **`versions`** bucket (the audio bucket's id is
`versions`, not `songs`); covers live in the existing public **`covers`** bucket.
Both allow writes only to authenticated artist members (coarse policy for the
single-artist phase — see spec §7). Functional upload testing happens via the app
in Plan 2; here we set the policies and verify they exist.

**Files:**
- Create: `supabase/migrations/20260712001000_storage_policies.sql`

- [ ] **Step 1: Write the verification block** (run now; the policy-count assert should fail until applied)

```sql
do $$
declare n int;
begin
  select count(*) into n from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname in (
        'members write versions','members update versions','members delete versions',
        'members write covers','members update covers','members delete covers');
  assert n = 6, 'expected 6 storage write policies for members (found ' || n || ')';
  assert exists (select 1 from storage.buckets where id='covers'   and public), 'covers bucket public';
  assert exists (select 1 from storage.buckets where id='versions' and public), 'versions bucket public';
  raise notice 'Task 10 verification passed';
end $$;
```

- [ ] **Step 2: Run it — expect failure** (assert fails: fewer than 6 policies).

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/20260712001000_storage_policies.sql
-- Member-only write policies on the versions (audio) and covers buckets.
-- Both buckets already exist and are public.

update storage.buckets set public = true where id in ('versions','covers');

-- Helper: is the caller a member of ANY artist? (coarse; tighten to per-artist
-- path parsing when the platform opens up — spec §7.)
create or replace function public.is_any_artist_member()
  returns boolean language sql security definer set search_path = public, pg_temp stable
as $$
  select exists (select 1 from public.artist_members where user_id = auth.uid());
$$;
grant execute on function public.is_any_artist_member() to authenticated, anon;

-- Clean up any earlier policies that targeted a mis-named 'songs' bucket.
drop policy if exists "members write songs"  on storage.objects;
drop policy if exists "members update songs" on storage.objects;
drop policy if exists "members delete songs" on storage.objects;

-- versions bucket (audio)
drop policy if exists "members write versions" on storage.objects;
create policy "members write versions" on storage.objects for insert to authenticated
  with check (bucket_id = 'versions' and public.is_any_artist_member());
drop policy if exists "members update versions" on storage.objects;
create policy "members update versions" on storage.objects for update to authenticated
  using (bucket_id = 'versions' and public.is_any_artist_member());
drop policy if exists "members delete versions" on storage.objects;
create policy "members delete versions" on storage.objects for delete to authenticated
  using (bucket_id = 'versions' and public.is_any_artist_member());

-- covers bucket
drop policy if exists "members write covers" on storage.objects;
create policy "members write covers" on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and public.is_any_artist_member());
drop policy if exists "members update covers" on storage.objects;
create policy "members update covers" on storage.objects for update to authenticated
  using (bucket_id = 'covers' and public.is_any_artist_member());
drop policy if exists "members delete covers" on storage.objects;
create policy "members delete covers" on storage.objects for delete to authenticated
  using (bucket_id = 'covers' and public.is_any_artist_member());
```

- [ ] **Step 4: Apply the migration.**

- [ ] **Step 5: Re-run the verification block — expect success** (6 policies present; both buckets public).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260712001000_storage_policies.sql
git commit -m "feat(storage): covers bucket + member-only write policies"
```

---

## Task 11: Seed your ownership + smoke-test end to end

Wire your own account as `owner` of `bohns`, then run one non-rollback smoke test to confirm the whole chain works against real data (create → version → cleanup).

**Files:** none (manual SQL, documented in the spec §9).

- [ ] **Step 1: Find your user id and the bohns artist id**

```sql
select id, email from auth.users;                 -- copy your id
select id, name from public.artists where lower(name) = 'bohns';
```

- [ ] **Step 2: Insert your ownership** (persists — this is intentional)

```sql
-- Seed yourself as owner of bohns, matched by your Google login email.
insert into public.artist_members (artist_id, user_id, role)
select a.id, u.id, 'owner'
from public.artists a
join auth.users u on u.email = 'hello@bohns.design'   -- your login email
where lower(a.name) = 'bohns'
on conflict (artist_id, user_id) do update set role = 'owner';
```

- [ ] **Step 3: Smoke-test end to end, then clean up** (self-contained; discards its fixtures)

```sql
begin;
do $$
declare _artist uuid; _uid uuid; _album uuid; _tid uuid; _vid uuid; _path text;
begin
  select id into _artist from public.artists where lower(name) = 'bohns' limit 1;
  assert _artist is not null, 'bohns artist must exist';
  select user_id into _uid from public.artist_members
    where artist_id = _artist and role = 'owner' limit 1;
  assert _uid is not null, 'seed an owner first (Step 2)';

  perform set_config('request.jwt.claims',
    json_build_object('sub', _uid, 'role','authenticated')::text, true);

  _album := (public.create_album(_artist, '__smoke__', 'album', null, '{}')).id;
  _tid  := (public.create_track(_album, '__smoke_track__', null, null)).id;
  select version_id, upload_path into _vid, _path
    from public.create_version(_tid, '__smoke_ver__', 'demo', current_date);

  assert (select artist_id from public.albums where id = _album) = _artist, 'smoke album owned by bohns';
  raise notice 'end-to-end OK — sample upload_path = %', _path;
end $$;
rollback;   -- discard the smoke fixtures; your ownership row from Step 2 persists
```

Expected: a `NOTICE` printing a well-formed `upload_path`; no errors; the `bohns` membership row from Step 2 persists while the smoke album/track/version are rolled back.

- [ ] **Step 4: Commit a short runbook note**

```bash
# Record the seeding step so it's reproducible (no schema change).
git commit --allow-empty -m "docs: seed bohns ownership; API foundation verified end to end"
```

---

## Self-review notes (for the implementer)

- **Spec coverage:** artists/roles (T1), genres m2m (T2, T9), albums.artist_id (T3), setlist position (T4), write lockdown + public read (T5), album/track/version RPCs (T6–T8), storage buckets/policies (T10), manual ownership seeding (T11). `track_overview` is intentionally **not** modified here — read-ordering by `position` and any view changes belong to Plan 2 (UI), which consumes these RPCs.
- **Deferred (not this plan):** Works/variants, per-track cover editing, tightened per-artist storage policies, the inline edit UI.
- **Refinement vs spec §6:** `set_version_file` / `set_album_cover` take the SDK-derived public URL as an argument rather than recomputing it in SQL — this keeps the base URL out of the database (no project-ref config in Postgres) while remaining fully machine-written. Flag for Plan 2: the client must call `supabase.storage.from(bucket).getPublicUrl(path)` and pass `.data.publicUrl`.
