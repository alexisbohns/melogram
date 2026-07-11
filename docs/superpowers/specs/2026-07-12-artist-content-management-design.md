# Artist Content Management — Design Spec

**Date:** 2026-07-12
**Status:** Approved design → ready for implementation planning
**Author:** Alexis (with Claude)

## 1. Problem

Publishing a song today is a painful, multi-step manual process in the Supabase
dashboard: create a `tracks` row, create the `album_tracks` join, create a
`versions` row, create the track's folder in the `songs` bucket following
`{track.slug}-{track.id}`, upload the file as `{track.slug}-{version.id}.m4a`,
copy the file's URL, and paste it back into the `versions.resource_url` column.

We want an in-app interface that lets an artist CRUD albums (with cover upload),
tracks, and versions (with file upload), and manage an album's setlist and its
order — with a permissions layer so access is scoped to the artist.

## 2. Goals & scope

**In scope (this build):**

- **Model:** an `artist_members` roles layer (`owner` / `maintainer`); link
  albums to artists; add setlist ordering; add a genre vocabulary.
- **API/RPC:** `SECURITY DEFINER` Postgres functions for all album/track/version
  CRUD + setlist reorder, each enforcing artist membership internally.
- **Storage:** direct-to-bucket uploads for audio and covers, authorized by
  Storage RLS; `resource_url` / `cover_url` written by RPC, never by hand.
- **UI:** inline (WYSIWYG) edit mode on the existing album page, gated to members.

**Out of scope (explicitly deferred):**

- The **Work / variant** model (acoustic / live / remix / orchestral, covers,
  remixes, cross-artist authorship). Nothing here blocks it; see §11.
- The track page that browses work-in-progress versions.
- Self-serve artist onboarding — artists and memberships are seeded **manually in
  Supabase** for now. Opening the platform comes later.
- A maintainer-management UI (owner adding/removing members). Roles are assigned
  by hand in Supabase this build.
- Comments / reactions UI (those tables exist but are unrelated to this work).
- Tightened per-artist Storage policies (see §7 — a coarse policy ships now).

## 3. Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Roles model | `artists` (exists) + `artist_members(artist_id, user_id, role)` junction | Clean owner/maintainer, scales to opening up |
| Write architecture | `SECURITY DEFINER` RPCs + direct Storage uploads | Cross-platform contract (web/iOS/Android call identically); **no service-role key needed** — every write authorized by the caller's session |
| Audio/cover URL | Keep `resource_url` / `cover_url`, **machine-written** by RPC from the deterministic path | Never paste by hand; retains an escape hatch for external URLs |
| Genre | `genres` + `album_genres` many-to-many | Controlled, searchable combobox; multi-select chips |
| Slug | Existing generated 3-char column; `id` disambiguates the path | Not user-editable by construction; renames don't break stored URLs |
| `version_status` | Cosmetic production tag (`raw, draft, demo, prototype, final`) | **No visibility gating** — public read unchanged |
| Track ↔ version link | **`track_versions` junction is canonical** | The `track_overview` view reads through it; also the future variant seam |
| Edit UX | Inline edit mode on the album page | Modern/WYSIWYG; fits the single-artist "make it feel real" phase |

## 4. Current schema (relevant existing tables)

Confirmed from the live database (2026-07-12):

- `artists(id, name, slug*, created_at)` — **already exists**. `slug*` is a
  generated column: `lower(substring(regexp_replace(name,'[^A-Za-z0-9]','','g') from 1 for 3))`.
- `albums(id, type <enum>, name, description, cover_url, created_at)` — **no
  `artist_id` yet**. `type` is a Postgres enum (values read at implementation time).
- `tracks(id, name, slug*, description, lyrics, cover_url, created_at)` — has its
  own `cover_url`. `slug*` generated as above.
- `versions(id, name, status <version_status>, resource_url, release_date, description, track_id → tracks, created_at)`.
  `version_status` enum = `raw, draft, demo, prototype, final`. **`versions` has no
  `slug` column by design** — the storage path inherits the *track's* slug, so the
  file is named `{track.slug}-{version.id}.m4a` (the version contributes only its id).
- `track_versions(track_id → tracks, version_id → versions, created_at, pk(track_id, version_id))`
  — **canonical** track↔version link (used by `track_overview`).
- `album_tracks(id bigint identity, album_id → albums, track_id → tracks, created_at)`
  — **no position column yet**.
- `track_like_counts`, `track_likes`, `reactions`, `reaction_clicks`, `threads`,
  `comments`, `track_plays`, `rights` — present, out of scope here.
- `track_overview` view: computes `latest_*` per track via
  `track_versions → versions` ordered by `release_date desc, created_at desc`;
  "primary album" = most-recently-linked `album_tracks` (by `created_at desc`);
  `like_count` from `track_like_counts`.

RLS is **enabled** on all core tables (`tracks, artists, versions, albums,
album_tracks, track_versions`), with permissive public SELECT (the anon client
reads them).

## 5. Schema changes

### 5.1 New tables

```sql
-- Roles layer: which users can manage which artist.
create table public.artist_members (
  artist_id  uuid not null references public.artists(id) on delete cascade,
  user_id    uuid not null references auth.users(id)     on delete cascade,
  role       text not null check (role in ('owner','maintainer')),
  created_at timestamptz not null default now(),
  primary key (artist_id, user_id)
);

-- Controlled genre vocabulary (searchable combobox source).
create table public.genres (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text not null,           -- proper slug of name (see §5.4)
  created_at timestamptz not null default now()
);

-- Albums ↔ genres (many-to-many).
create table public.album_genres (
  album_id uuid not null references public.albums(id)  on delete cascade,
  genre_id uuid not null references public.genres(id)  on delete cascade,
  primary key (album_id, genre_id)
);
```

### 5.2 Alters

```sql
-- Link albums to their artist (backfill = the seeded bohns artist).
alter table public.albums add column artist_id uuid references public.artists(id);

-- Setlist ordering within an album.
alter table public.album_tracks add column position int;
-- Backfill: per album, number existing links by created_at.
```

No column is added to `versions`: the audio file inherits the track's slug (see §5.4).

`track_overview` and app queries switch to ordering an album's tracks by
`album_tracks.position` (primary-album selection and latest-version logic are
unchanged).

### 5.3 RLS / lockdown

- **Keep** the existing permissive public SELECT on all content tables and on the
  new `artists`, `genres`, `album_genres`.
- **Ensure no client write policies exist** on
  `albums, tracks, versions, album_tracks, track_versions, album_genres` — writes
  flow exclusively through `SECURITY DEFINER` RPCs (which bypass RLS as the
  function owner). Enable RLS on the three new tables.
- `artist_members`: RLS on; a member may SELECT rows for artists they belong to;
  **no client writes** (seeded in Supabase this build).

### 5.4 Slug note

Existing `tracks`/`artists` slugs are a generated 3-char prefix; the `id` in the
storage path guarantees uniqueness, so collisions are irrelevant. **`versions` have
no slug of their own** — the audio path reuses the *track's* slug plus the version
`id`. `genres` uses a proper full slug of `name` (it appears in filters/URLs, not
storage paths).

## 6. RPC surface (the "API")

All functions are `SECURITY DEFINER`, `search_path` pinned, and call the
membership guard **first**. They are the single write contract for every client.

```sql
-- Guard: is the current user a member of this artist?
create function public.is_artist_member(_artist_id uuid) returns boolean
  language sql security definer stable as $$
  select exists (
    select 1 from public.artist_members m
    where m.artist_id = _artist_id and m.user_id = auth.uid()
  );
$$;
```

**Albums**
- `create_album(_artist_id, _name, _type, _description, _genre_ids uuid[]) → albums`
  — guard `_artist_id`; insert album; insert `album_genres`.
- `update_album(_album_id, _name, _description, _type)` — guard via the album's artist.
- `delete_album(_album_id)`.
- `set_album_genres(_album_id, _genre_ids uuid[])` — replace the album's genre set.
- `set_album_cover(_album_id, _path text)` — after the client uploads the cover,
  validate and write `cover_url` = public URL for `_path` (cover extension varies,
  so the path is passed in and validated).

**Tracks**
- `create_track(_album_id, _name, _description, _lyrics) → tracks`
  — guard via album's artist; insert track; insert `album_tracks` at
  `position = max(position)+1`. Replaces the manual track→join dance.
- `update_track(_track_id, _name, _description, _lyrics)`.
- `remove_track_from_album(_album_id, _track_id)` — unlink only (a track may sit on
  multiple albums).
- `delete_track(_track_id)` — remove `album_tracks` links, `track_versions` links,
  and now-orphaned `versions` rows (their files cleaned up client-side; see §7).
- `reorder_setlist(_album_id, _ordered_track_ids uuid[])` — set `position` per the
  array order in one atomic call.

**Versions**
- `create_version(_track_id, _name, _status, _release_date) → (version_id uuid, upload_path text)`
  — guard via the track's artist; insert `versions` (with `track_id` kept in sync)
  and a `track_versions` link; compute and return
  `upload_path = {track.slug}-{track.id}/{track.slug}-{version.id}.m4a`
  (the file reuses the track's slug; the version contributes only its `id`).
- `set_version_file(_version_id)` — after upload, **recompute** the deterministic
  path and write `resource_url` = its public URL (no client-supplied path — fully
  machine-written).
- `update_version(_version_id, _name, _status, _release_date)`.
- `delete_version(_version_id)` — remove `track_versions` link(s) + the `versions`
  row (file cleaned up client-side).

**Genres**
- `create_genre(_name) → genres` — any authenticated `artist_member` may extend the
  vocabulary. Listing genres is a plain public SELECT (no RPC).

Each RPC is atomic and self-authorizing: one round trip replaces the entire
create-track → join → version → path → paste chain.

## 7. Storage

- **`songs`** bucket (exists, public): audio at
  `{track.slug}-{track.id}/{track.slug}-{version.id}.m4a`.
- **Covers:** confirm whether a bucket exists (`select id,name from storage.buckets`);
  if not, create a public `covers` bucket. Cover path e.g. `{album.slug}-{album.id}.<ext>`.
- **Chicken/egg solved:** the row is created first (`create_version` returns the
  id and path), *then* the client uploads to the now-known path, *then*
  `set_version_file` writes the URL.
- **Storage RLS (coarse, this build):** on `storage.objects` for `songs`/`covers`,
  INSERT/UPDATE/DELETE require the caller to be an `artist_member` of **any**
  artist; SELECT stays public. **Known simplification** — tighten to per-artist
  path parsing when the platform opens up.
- **File deletion on row delete** is done client-side via the Storage SDK
  (Postgres can't cleanly delete storage objects). Orphan-cleanup automation is a
  follow-up, not this build.

## 8. Inline edit UI

- **Gating:** the album page (server component) checks whether the current user is
  an `artist_member` of the album's artist and passes a `canEdit` prop. The Edit
  toggle renders only when `canEdit`.
- **`EditProvider`** (client context) flips existing components
  (`AlbumDetailCard`, `AlbumHeader`, `AlbumPlaylist`, `AlbumTrack`) into editable
  variants. The listener render path is untouched when not editing.
  - Name / description → `contenteditable`.
  - Cover → click-to-replace (upload → `set_album_cover`).
  - Genres → chip multi-select combobox reading from `genres` (search); commits via
    `set_album_genres`.
  - Track rows → drag-reorder (`reorder_setlist`), remove
    (`remove_track_from_album`), add-track (`create_track`).
  - Versions (the fiddly part) → a per-track expandable panel with a dropzone +
    progress: `create_version` → upload → `set_version_file`.
- **Persistence — explicit Save / Cancel.** Entering edit mode stages changes in
  local client state; a single **Save** commits the batch and **Cancel** discards
  it. Save persists album fields, the genre set, track-list membership, setlist
  order, and track metadata via the RPCs, called through the authenticated browser
  Supabase client (the session authorizes them via the membership guard + Storage
  RLS). **No service-role key anywhere.**
- **File uploads are immediate, discrete actions — not part of the Save batch.** A
  binary can't sit comfortably in staged form state, and `create_version` must
  insert the row before the upload path exists. So the per-track Versions panel
  treats *create version → upload → finalize*, *replace file*, and *delete version*
  as their own confirmed operations with progress; cover replacement likewise
  uploads on pick. Metadata around them (status, name, release date) still saves
  with the batch.

## 9. Access seeding (manual, documented)

In the Supabase SQL editor:

```sql
-- Assign yourself as owner of the bohns artist.
insert into public.artist_members (artist_id, user_id, role)
values ('<bohns_artist_id>', '<your_auth_user_id>', 'owner');
```

The migration also backfills `albums.artist_id` to the bohns artist.

## 10. Open items (resolved at implementation, non-blocking)

- Read the `albums.type` enum values for the type `<select>` in the edit UI.
- Confirm the `covers` bucket exists; create it (public) if absent.
- Verify/remove any stray client write policies on the content tables (§5.3).

## 11. Forward-compatibility (deferred work this design must not block)

- **Works / variants:** the `track_versions` junction already lets a recording
  attach to multiple tracks — the seam the variant model grows from. Future
  additive changes: a `works` concept (relational or entity — TBD), plus track-level
  `variant_type` / `relation` / performer-artist attributes. None conflict with
  this build.
- **Per-track covers** (`tracks.cover_url`) can become editable with a small
  addition; album cover ships first.
- **Maintainer management, self-serve onboarding, tightened Storage policies** —
  additive, on top of the roles layer defined here.
