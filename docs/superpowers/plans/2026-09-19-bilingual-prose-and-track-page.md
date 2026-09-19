# Bilingual Prose & the Track Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split every track's and album's single `description` into a short blurb plus a long markdown `story`, make both bilingual (en/fr), and give tracks a page of their own at `/tracks/[id]` where the prose lives.

**Architecture:** Suffixed columns (`description_fr`, `story`, `story_fr`) on `public.tracks` and `public.albums`; the four write RPCs grow parameters; `track_overview` is recovered from a dump and re-declared with the new track columns. The data layer stays locale-agnostic and returns every column — a `localized(en, fr, locale)` helper resolves at render, silently falling back to English. A new server-rendered `/tracks/[id]` page pairs a client hero (play / like / lyrics) with a `<Prose>` markdown block; the album page grows the same prose block below its tracklist. The strips clamp to two lines, so uniformity lands before a single word is rewritten.

**Tech Stack:** Next.js 16 (App Router, RSC), TypeScript, CSS Modules, Supabase (Postgres RPC + views), `react-markdown` + `remark-gfm`.

**Spec:** `docs/superpowers/specs/2026-09-19-bilingual-prose-and-track-page-design.md`

---

## Before you start

**There is no test runner in this repo, and adding one is out of scope.** Do not invent one, and do not write test files — there is nowhere for them to run. Every task below verifies with:

```bash
npx tsc --noEmit        # types
npm run lint            # eslint
```

and, at the milestones that say so, `npm run build` plus a named manual check in the browser (`npm run dev`, http://localhost:3000).

**Two tasks need Alexis and cannot be done by an agent alone:**

- **Task 3** needs a `pg_get_viewdef` dump of `track_overview`. Stop and ask for it.
- **Task 4** applies the migration to the hosted Supabase project. There is no `supabase/config.toml` and no CLI in `package.json`, so migrations are run **by hand in the Supabase SQL editor**. Stop and ask.

Work on the branch `bilingual-prose-track-page`, which already carries the spec commit.

## Vocabulary

Read these before touching code — the plan uses them constantly.

- **`track_overview`** — a Postgres **view**, the read model for tracks. Its columns are prefixed (`track_id`, `track_name`, `track_description`). Every listener-facing read goes through it. It is **not** the `tracks` table.
- **`tracks` / `albums`** — the write model. The RPCs write here; `getTrackDetails` and `getLyrics` read here directly.
- **Full overwrite** — `update_track` and `update_album` set every column from their parameters. A value you leave out of the call is **erased**, not preserved. This is why the drawer seeds from an authoritative fetch and why the EN/FR toggle must never drop the hidden locale from the payload.
- **`hasVersion(track)`** — a track is publicly visible only once it has a version. It governs visibility everywhere; the new page must not become a way around it.

## File structure

**Created:**

| Path | Responsibility |
|---|---|
| `supabase/migrations/20260919000000_bilingual_prose.sql` | Columns, backfill, four RPC signatures, the recovered view |
| `src/components/Prose.tsx` + `.module.css` | Render a markdown string. Used by the track page (server) and the album card (client) |
| `src/components/TrackHero.tsx` + `.module.css` | The track page's interactive header: cover, name, album link, play, like, duration, lyrics |
| `src/components/AlbumStory.tsx` + `.module.css` | The album's prose section — read and edit modes |
| `src/components/edit/LocaleTabs.tsx` + `.module.css` | The EN / FR segmented toggle, shared by the drawer and the album story |
| `src/app/tracks/[id]/page.tsx` + `page.module.css` | The track page |
| `src/app/tracks/[id]/opengraph-image.tsx`, `twitter-image.tsx` | Social share images, reusing the album renderer |

**Modified:**

| Path | Change |
|---|---|
| `src/lib/types.ts` | New columns on `Album`, `Track`, `TrackDetails` |
| `src/lib/data.ts` | `ALBUM_COLS` / `TRACK_COLS`; new `getTrack`, `getTrackAlbumBasics` |
| `src/lib/i18n/config.ts` | `localized()` |
| `src/lib/i18n/messages/{en,fr}.ts` | `sections.notes`, `player.track` |
| `src/lib/edit.ts` | `createTrack`, `updateTrack`, `getTrackDetails`, `updateAlbum` signatures |
| `src/player/PlayerProvider.tsx` | `toPlayerTrack` takes a locale |
| `src/components/StandaloneTrack.tsx` + `.module.css` | Localized description, name links, clamp |
| `src/components/AlbumTrack.tsx` + `.module.css` | Same |
| `src/components/AlbumCard.tsx` + `.module.css` | Localized description, clamp |
| `src/components/AlbumDetailCard.tsx` | Localized description, `<AlbumStory>` after the playlist |
| `src/components/PlayerBar.tsx` | A Track link in the expanded drawer |
| `src/components/edit/TrackDrawer.tsx` | Six fields behind the EN/FR toggle, soft counter |
| `src/components/edit/controls.module.css` | `.counter`, `.counterOver` |
| `src/components/edit/AlbumEditProvider.tsx` | Draft carries the three new album fields |
| `README.md` | The new page and the bilingual content fields |

---

## Task 1: Migration — columns and backfill

**Files:**
- Create: `supabase/migrations/20260919000000_bilingual_prose.sql`

- [ ] **Step 1: Write the migration's first section**

Create the file with exactly this content (later tasks append to it — do not apply it yet):

```sql
-- Bilingual prose (2026-09-19).
--
-- `description` did two incompatible jobs: the short blurb in the strips and
-- the only place to write at length. It is split in two — `description` stays
-- short (strips, rows), `story` holds long markdown (the track and album
-- pages) — and both become bilingual via `_fr` columns.
--
-- The 200-character rule on `description` is NOT enforced here. Phase 1 seeds
-- `story` from today's descriptions, phase 2 is Alexis rewriting them by hand,
-- and phase 3 adds the check constraint. See the design spec, §9.

alter table public.tracks
  add column description_fr text,
  add column story          text,
  add column story_fr       text;

alter table public.albums
  add column description_fr text,
  add column story          text,
  add column story_fr       text;

-- Phase 1 seed: today's descriptions ARE the prose. Nothing is lost.
update public.tracks set story = description where description is not null;
update public.albums set story = description where description is not null;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260919000000_bilingual_prose.sql
git commit -m "Add the bilingual prose columns and their phase-1 backfill"
```

---

## Task 2: Migration — RPC signatures

**Files:**
- Modify: `supabase/migrations/20260919000000_bilingual_prose.sql` (append)

Read `supabase/migrations/20260712000600_rpc_albums.sql` and `20260712000700_rpc_tracks.sql` first — the bodies below are those functions with the new columns threaded through, and the membership guards must stay byte-for-byte identical.

- [ ] **Step 1: Append the four functions**

`create or replace` will not replace a function whose **signature** changed — it creates an overload, and PostgREST then cannot resolve the call. Each `drop function` below is load-bearing.

Append to the migration:

```sql
-- The four write RPCs grow parameters. Postgres overloads rather than
-- replaces when a signature changes, so each old signature is dropped first —
-- otherwise PostgREST sees two candidates and the call fails. Parameter order
-- is English then French, description then story, in all four.

drop function if exists public.create_track(uuid, text, text, text);

create or replace function public.create_track(
  _album_id       uuid,
  _name           text,
  _description    text default null,
  _description_fr text default null,
  _story          text default null,
  _story_fr       text default null,
  _lyrics         text default null
) returns public.tracks
  language plpgsql security definer set search_path = public, pg_temp
as $$
declare _track public.tracks; _next int;
begin
  if not public.is_member_of_album(_album_id) then
    raise exception 'not a member of this album''s artist' using errcode = '42501';
  end if;
  insert into public.tracks (name, description, description_fr, story, story_fr, lyrics)
    values (_name, _description, _description_fr, _story, _story_fr, _lyrics)
    returning * into _track;
  select coalesce(max(position), 0) + 1 into _next
    from public.album_tracks where album_id = _album_id;
  insert into public.album_tracks (album_id, track_id, position)
    values (_album_id, _track.id, _next);
  return _track;
end $$;

drop function if exists public.update_track(uuid, text, text, text);

create or replace function public.update_track(
  _track_id       uuid,
  _name           text,
  _description    text,
  _description_fr text,
  _story          text,
  _story_fr       text,
  _lyrics         text
) returns public.tracks
  language plpgsql security definer set search_path = public, pg_temp
as $$
declare _track public.tracks;
begin
  if not public.is_member_of_track(_track_id) then
    raise exception 'not a member of this track''s artist' using errcode = '42501';
  end if;
  update public.tracks set
      name           = _name,
      description    = _description,
      description_fr = _description_fr,
      story          = _story,
      story_fr       = _story_fr,
      lyrics         = _lyrics
    where id = _track_id returning * into _track;
  return _track;
end $$;

drop function if exists public.create_album(uuid, text, public.album_type, text, uuid[]);

create or replace function public.create_album(
  _artist_id      uuid,
  _name           text,
  _type           public.album_type,
  _description    text default null,
  _description_fr text default null,
  _story          text default null,
  _story_fr       text default null,
  _genre_ids      uuid[] default '{}'
) returns public.albums
  language plpgsql security definer set search_path = public, pg_temp
as $$
declare _album public.albums;
begin
  if not public.is_artist_member(_artist_id) then
    raise exception 'not a member of artist %', _artist_id using errcode = '42501';
  end if;
  insert into public.albums (artist_id, name, type, description, description_fr, story, story_fr)
    values (_artist_id, _name, _type, _description, _description_fr, _story, _story_fr)
    returning * into _album;
  if array_length(_genre_ids, 1) is not null then
    insert into public.album_genres (album_id, genre_id)
      select _album.id, g from unnest(_genre_ids) g
      on conflict do nothing;
  end if;
  return _album;
end $$;

drop function if exists public.update_album(uuid, text, text, public.album_type);

create or replace function public.update_album(
  _album_id       uuid,
  _name           text,
  _description    text,
  _description_fr text,
  _story          text,
  _story_fr       text,
  _type           public.album_type
) returns public.albums
  language plpgsql security definer set search_path = public, pg_temp
as $$
declare _album public.albums;
begin
  if not public.is_member_of_album(_album_id) then
    raise exception 'not a member of this album''s artist' using errcode = '42501';
  end if;
  update public.albums set
      name           = _name,
      description    = _description,
      description_fr = _description_fr,
      story          = _story,
      story_fr       = _story_fr,
      type           = _type
    where id = _album_id
    returning * into _album;
  return _album;
end $$;
```

- [ ] **Step 2: Check the dropped signatures against the originals**

Run:

```bash
grep -n "create or replace function public.\(create\|update\)_\(track\|album\)" -A 8 \
  supabase/migrations/20260712000600_rpc_albums.sql \
  supabase/migrations/20260712000700_rpc_tracks.sql
```

Expected: four parameter lists that match, argument type for argument type, the four `drop function if exists` lines just written. A mismatch means the drop is a no-op and a stale overload will survive — fix before moving on.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260919000000_bilingual_prose.sql
git commit -m "Thread the prose columns through the album and track RPCs"
```

---

## Task 3: Migration — recover `track_overview`

**Files:**
- Modify: `supabase/migrations/20260919000000_bilingual_prose.sql` (append)

**This task is blocked on Alexis.** The view predates the migrations folder and its definition is nowhere in the repo. Do not guess it, and do not work around it by adding another `attach*` helper in the data layer — the spec chose recovery precisely to stop that pattern from spreading.

- [ ] **Step 1: Ask for the dump**

Ask Alexis to run this in the Supabase SQL editor and paste the result:

```sql
select pg_get_viewdef('public.track_overview'::regclass, true);
```

- [ ] **Step 2: Append the recovered view with three new columns**

Write the returned definition verbatim under a `create or replace view public.track_overview as`, adding exactly three columns to the select list, next to the existing `t.description as track_description`:

```sql
       t.description_fr as track_description_fr,
       t.story          as track_story,
       t.story_fr       as track_story_fr,
```

(`t` is whatever alias the dump gives the `tracks` table — use that alias, not a new one.) Prepend this comment:

```sql
-- track_overview, recovered via pg_get_viewdef and brought under version
-- control for the first time (it predates this folder), plus the three new
-- track prose columns. Column ORDER and names of everything already present
-- must not change: TRACK_COLS in src/lib/data.ts selects them by name, and
-- `create or replace view` refuses to drop or reorder existing columns.
```

- [ ] **Step 3: Preserve `security_invoker`**

Run:

```bash
grep -n "security_invoker" supabase/migrations/20260715000000_track_play_counts.sql
```

`create or replace view` **keeps** existing view options, so nothing is needed if the view already sets it. If the dump or that grep shows `track_overview` was created with `security_invoker = true`, append it explicitly so the file is self-contained:

```sql
alter view public.track_overview set (security_invoker = true);
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260919000000_bilingual_prose.sql
git commit -m "Bring track_overview under version control with its prose columns"
```

---

## Task 4: Apply the migration

**Files:** none (a hosted-database operation)

**This task is blocked on Alexis.** There is no Supabase CLI in this project; migrations are applied by hand.

- [ ] **Step 1: Ask Alexis to apply it**

Ask them to paste the whole of `supabase/migrations/20260919000000_bilingual_prose.sql` into the Supabase SQL editor and run it, as one transaction.

- [ ] **Step 2: Verify the columns and the backfill**

Ask for the output of:

```sql
select count(*) as tracks_total,
       count(story) as tracks_with_story,
       count(description) as tracks_with_description
from public.tracks;
```

Expected: `tracks_with_story` equals `tracks_with_description`. If it doesn't, the backfill did not run and nothing below should proceed.

- [ ] **Step 3: Verify the view still reads**

Ask for the output of:

```sql
select track_id, track_name, track_description, track_description_fr,
       track_story, track_story_fr, latest_version_id
from public.track_overview
limit 3;
```

Expected: three rows, the new columns present, `track_story` mirroring `track_description`, and `latest_version_id` still populated. **This is the riskiest step in the plan** — a wrong recovered definition breaks every track read on the site. If anything looks off, stop and restore the previous definition before continuing.

- [ ] **Step 4: Verify no stale RPC overloads survived**

Ask for the output of:

```sql
select p.proname, pg_get_function_identity_arguments(p.oid) as args
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('create_track','update_track','create_album','update_album')
order by p.proname;
```

Expected: **exactly four rows**. Five or more means a `drop function` signature was wrong in Task 2 and an old overload is still registered — PostgREST calls will fail ambiguously. Fix Task 2 and re-apply before continuing.

---

## Task 5: Types and column lists

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/data.ts:13-14`, `:20-21`

- [ ] **Step 1: Add the columns to `Album`**

In `src/lib/types.ts`, in `export type Album`, right after the `description` line:

```ts
  description: string | null;
  /** French blurb; null falls back to `description` (see i18n/config localized). */
  description_fr: string | null;
  /** Long-form markdown shown on the album page, below the tracklist. */
  story: string | null;
  story_fr: string | null;
```

- [ ] **Step 2: Add the columns to `TrackDetails`**

In `export type TrackDetails` — the edit view, seeded from the `tracks` table:

```ts
export type TrackDetails = {
  id: string;
  name: string;
  description: string | null;
  description_fr: string | null;
  story: string | null;
  story_fr: string | null;
  lyrics: string | null;
};
```

- [ ] **Step 3: Add the columns to `Track`**

In `export type Track` — the `track_overview` view, so the names are prefixed — after `track_description`:

```ts
  track_description: string | null;
  track_description_fr: string | null;
  /** Long-form markdown shown on /tracks/[id]. */
  track_story: string | null;
  track_story_fr: string | null;
```

- [ ] **Step 4: Widen the column lists**

In `src/lib/data.ts`, replace the two constants:

```ts
const ALBUM_COLS =
  "id,artist_id,name,description,description_fr,story,story_fr,type,cover_url,theme,position,created_at";
```

```ts
const TRACK_COLS =
  "track_id,track_name,track_description,track_description_fr,track_story,track_story_fr,album_id,album_name,album_cover_url,latest_version_id,latest_status,latest_resource_url,latest_release_date,like_count";
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: PASS. (The new fields are required, but every value flows from a `data as Album` / `data as Track` cast, so no call site needs changing yet.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/data.ts
git commit -m "Carry the prose columns through the types and the catalog queries"
```

---

## Task 6: The `localized` helper

**Files:**
- Modify: `src/lib/i18n/config.ts`

`config.ts` is the client-safe module — it must never import `next/headers`, which is why this goes here and not in `index.ts`.

- [ ] **Step 1: Append the helper**

```ts
/**
 * Resolve a bilingual content pair for a locale. Content columns come in
 * `x` / `x_fr` pairs (see the Album and Track types); a missing French value
 * falls back to English silently — no "untranslated" badge, the reader just
 * gets the English text.
 */
export function localized(
  en: string | null,
  fr: string | null,
  locale: Locale
): string | null {
  return (locale === "fr" ? fr : null) ?? en;
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS, no warnings about an unused export.

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/config.ts
git commit -m "Add the bilingual content resolver"
```

---

## Task 7: New message keys

**Files:**
- Modify: `src/lib/i18n/messages/en.ts`, `src/lib/i18n/messages/fr.ts`

`Messages = typeof en`, so `en` is the contract and `fr` must satisfy it — add to both or the build fails. The edit UI is deliberately English-only (see `EditToggle`), so no edit strings go here.

- [ ] **Step 1: Add to `en`**

In `sections`, after `all`:

```ts
    all: "All",
    notes: "Notes",
```

In `player`, after `lyrics`:

```ts
    lyrics: "Lyrics",
    track: "Track",
```

- [ ] **Step 2: Add to `fr`**

The same two keys, in the same two objects — an adaptation, informal "Tu", not a literal translation:

```ts
    notes: "Notes",
```

```ts
    track: "Morceau",
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: PASS. A missing key in `fr` fails here with "Property 'notes' is missing in type" — that is the contract working.

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/messages
git commit -m "Add the notes and track message keys"
```

---

## Task 8: Clamp the strips

**Files:**
- Modify: `src/components/StandaloneTrack.module.css:125`
- Modify: `src/components/AlbumTrack.module.css:77`
- Modify: `src/components/AlbumCard.module.css:17`

This is the change that makes the rails uniform **today**, with the long descriptions still in place. It ships before a single word is rewritten.

- [ ] **Step 1: Clamp `StandaloneTrack`**

In `.description`, after `line-height: 22px;`:

```css
  /* Two lines, always: the rails read as one strip whatever the blurb's
     length. The long prose lives on the track page now. */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
```

- [ ] **Step 2: Clamp `AlbumTrack`**

The same five lines in its `.description` rule, after `line-height: 22px;`. Leave `grid-column: 2 / -1` and the mobile override alone — `display: -webkit-box` changes how the box lays out its own children, not how it sits in the grid.

- [ ] **Step 3: Clamp `AlbumCard`**

The same five lines in its `.description` rule, after `line-height: 22px;`. Leave `align-self: stretch` alone.

- [ ] **Step 4: Verify in the browser**

Run: `npm run dev`, open http://localhost:3000
Expected: every home rail item and every album card blurb stops at two lines, with no ellipsis-less overflow and no change in card heights between neighbours.

- [ ] **Step 5: Commit**

```bash
git add src/components/StandaloneTrack.module.css src/components/AlbumTrack.module.css src/components/AlbumCard.module.css
git commit -m "Clamp the strip blurbs to two lines"
```

---

## Task 9: The `Prose` component

**Files:**
- Create: `src/components/Prose.tsx`, `src/components/Prose.module.css`
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install the renderer**

```bash
npm install react-markdown remark-gfm
```

- [ ] **Step 2: Write the component**

`src/components/Prose.tsx` — **no `"use client"`**. `react-markdown` holds no state and calls no hooks, so it renders in a server component; the album card, which is a client component, can import it too.

```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./Prose.module.css";

/**
 * Long-form markdown — a track's or album's `story`. Headings are demoted by
 * one level so the surrounding page keeps a single h1, and raw HTML is escaped
 * rather than rendered (no rehype-raw): liner notes have no need for it.
 */
export default function Prose({ markdown }: { markdown: string }) {
  return (
    <div className={styles.prose}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h2>{children}</h2>,
          h2: ({ children }) => <h3>{children}</h3>,
          h3: ({ children }) => <h4>{children}</h4>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
```

- [ ] **Step 3: Write the styles**

`src/components/Prose.module.css` — palette variables only, so the prose wears whichever album's colors are in scope:

```css
.prose {
  color: var(--album-light);
  font-size: 16px;
  line-height: 26px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.prose h2,
.prose h3,
.prose h4 {
  font-family: var(--font-gloock), serif;
  font-weight: 400;
  line-height: 1.2;
}

.prose h2 {
  font-size: 24px;
}

.prose h3 {
  font-size: 20px;
}

.prose h4 {
  font-size: 18px;
}

.prose a {
  color: var(--album-accent);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.prose strong {
  font-weight: 700;
}

.prose em {
  font-style: italic;
}

.prose ul,
.prose ol {
  padding-left: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prose ul {
  list-style: disc;
}

.prose ol {
  list-style: decimal;
}

.prose blockquote {
  border-left: 2px solid color-mix(in srgb, var(--album-accent) 60%, transparent);
  padding-left: 16px;
  opacity: 0.85;
  font-style: italic;
}

.prose hr {
  border: 0;
  border-top: 1px solid color-mix(in srgb, var(--album-light) 12%, transparent);
}

.prose code {
  font-family: ui-monospace, monospace;
  font-size: 0.9em;
  background: color-mix(in srgb, var(--album-light) 8%, transparent);
  border-radius: 4px;
  padding: 1px 5px;
}

.prose img {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-button);
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/components/Prose.tsx src/components/Prose.module.css
git commit -m "Add the markdown prose renderer"
```

---

## Task 10: `getTrack` and `getTrackAlbumBasics`

**Files:**
- Modify: `src/lib/data.ts`

- [ ] **Step 1: Add the page read**

Append to `src/lib/data.ts` (it uses `attachThemesFromAlbums`, `attachDurations` and `getLyrics`, all already defined in the file — put it after `getLyrics` so the reference order reads naturally):

```ts
/** Everything `/tracks/[id]` renders: the track, its album (for the palette
    and the back-link) and its lyrics. */
export type TrackPage = {
  track: Track;
  album: Album | null;
  lyrics: string | null;
};

/**
 * One track for its own page. Returns null for an unknown track and for a
 * versionless one — `hasVersion` governs public visibility everywhere else,
 * and a direct link must not become the one door around it. (Unlike the album
 * page there is no owner-sees-more branch: this read is anonymous, and an
 * owner reaches an unreleased track through the album page's edit mode.)
 */
export async function getTrack(id: string): Promise<TrackPage | null> {
  const { data, error } = await supabase
    .from("track_overview")
    .select(TRACK_COLS)
    .eq("track_id", id)
    .maybeSingle();
  if (error || !data) return null;

  const track = data as Track;
  if (!hasVersion(track)) return null;

  const [albumRes, lyrics] = await Promise.all([
    track.album_id
      ? supabase.from("albums").select(ALBUM_COLS).eq("id", track.album_id).maybeSingle()
      : Promise.resolve({ data: null }),
    getLyrics([track.track_id]),
  ]);

  const album = (albumRes.data ?? null) as Album | null;
  if (album) attachThemesFromAlbums([album], [track]);
  await attachDurations(supabase, [track]);

  return { track, album, lyrics: lyrics[track.track_id] ?? null };
}

/** The album basics behind a track, for its share image. */
export async function getTrackAlbumBasics(
  trackId: string
): Promise<Pick<Album, "id" | "name" | "cover_url" | "theme"> | null> {
  const { data, error } = await supabase
    .from("track_overview")
    .select("album_id")
    .eq("track_id", trackId)
    .maybeSingle();
  const albumId = (data?.album_id ?? null) as string | null;
  if (error || !albumId) return null;
  return getAlbumBasics(albumId);
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/data.ts
git commit -m "Read a single track for its own page"
```

---

## Task 11: The track hero

**Files:**
- Create: `src/components/TrackHero.tsx`, `src/components/TrackHero.module.css`

A client component: it plays, likes, and opens the lyrics sheet. Model it on `StandaloneTrack.tsx`, which does the same three things in miniature — read it first.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Mic, Pause, Play } from "lucide-react";
import { toPlayerTrack, usePlayer } from "@/player/PlayerProvider";
import { formatTime } from "@/player/durations";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { localized } from "@/lib/i18n/config";
import type { Track } from "@/lib/types";
import LikeButton from "./LikeButton";
import LyricsSheet from "./LyricsSheet";
import styles from "./TrackHero.module.css";

type Props = {
  track: Track;
  lyrics: string | null;
};

/**
 * The track page's header: cover, name, album link, and the same three
 * actions a strip item carries — play, like, lyrics. The page's palette is
 * already in scope (PaletteScope), so nothing here resolves colors.
 */
export default function TrackHero({ track, lyrics }: Props) {
  const { current, isPlaying, toggle, playFrom } = usePlayer();
  const locale = useLocale();
  const m = useMessages();
  const [lyricsOpen, setLyricsOpen] = useState(false);

  const playable = Boolean(track.latest_resource_url);
  const active = current?.id === track.track_id && isPlaying;
  const description = localized(
    track.track_description,
    track.track_description_fr,
    locale
  );

  const onPlayClick = () => {
    if (!playable) return;
    if (current?.id === track.track_id) {
      toggle();
      return;
    }
    playFrom([toPlayerTrack(track, lyrics, locale)], 0);
  };

  return (
    <header className={styles.hero}>
      <div className={styles.cover}>
        {track.album_cover_url && (
          <Image
            src={track.album_cover_url}
            alt=""
            fill
            sizes="200px"
            className={styles.coverImg}
            priority
          />
        )}
        <span className={styles.texture} />
      </div>

      <div className={styles.body}>
        <h1 className={`${styles.name} ${active ? "shimmer" : ""}`}>
          {track.track_name}
        </h1>

        {track.album_id && track.album_name && (
          <Link href={`/albums/${track.album_id}`} className={styles.album}>
            {track.album_name}
          </Link>
        )}

        {description && <p className={styles.description}>{description}</p>}

        <div className={styles.controls}>
          <button
            type="button"
            className={`${styles.play} ${active ? styles.playing : ""}`}
            disabled={!playable}
            aria-label={
              active ? `Pause ${track.track_name}` : `Play ${track.track_name}`
            }
            onClick={onPlayClick}
          >
            {active ? (
              <Pause size={24} strokeWidth={2} />
            ) : (
              <Play size={24} strokeWidth={2} />
            )}
          </button>

          <span className={styles.time}>
            {track.duration !== null ? formatTime(track.duration) : "–:–"}
          </span>

          <LikeButton
            trackId={track.track_id}
            likeCount={track.like_count ?? 0}
          />

          {lyrics && (
            <button
              type="button"
              className={styles.iconButton}
              aria-label={`Lyrics of ${track.track_name}`}
              onClick={() => setLyricsOpen(true)}
            >
              <Mic size={20} strokeWidth={2} aria-hidden />
              {m.player.lyrics}
            </button>
          )}
        </div>
      </div>

      {lyrics && (
        <LyricsSheet
          open={lyricsOpen}
          onClose={() => setLyricsOpen(false)}
          trackName={track.track_name}
          lyrics={lyrics}
        />
      )}
    </header>
  );
}
```

`toPlayerTrack` does not take a locale yet — Task 12 adds it. Expect a type error at the end of this task; it is resolved there. If you would rather keep every task green, do Task 12 first.

- [ ] **Step 2: Write the styles**

Copy the cover/texture treatment from `StandaloneTrack.module.css` (read its `.cover`, `.coverImg` and `.texture` rules) at a larger size:

```css
.hero {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.cover {
  position: relative;
  width: 200px;
  aspect-ratio: 1;
  border-radius: var(--radius-button);
  overflow: hidden;
  background: color-mix(in srgb, var(--album-light) 8%, transparent);
}

.coverImg {
  object-fit: cover;
}

.texture {
  position: absolute;
  inset: 0;
  background-image: url("/textures/cover.png");
  background-size: cover;
  mix-blend-mode: overlay;
  opacity: 0.4;
  pointer-events: none;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.name {
  font-family: var(--font-gloock), serif;
  font-size: 40px;
  font-weight: 400;
  line-height: 1.1;
  color: var(--album-light);
}

.album {
  color: var(--album-accent);
  font-size: 16px;
  line-height: 22px;
  text-decoration: underline;
  text-underline-offset: 3px;
  width: fit-content;
}

.description {
  color: var(--album-light);
  opacity: 0.5;
  font-size: 16px;
  line-height: 22px;
}

.controls {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 4px;
}

.play {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--album-accent);
  color: var(--album-deep);
}

.play:disabled {
  opacity: 0.4;
  cursor: default;
}

.playing {
  background: var(--album-light);
}

.time {
  color: var(--album-light);
  opacity: 0.5;
  font-size: 14px;
  line-height: 18px;
  min-width: 30px;
}

.iconButton {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: var(--radius-button);
  background: color-mix(in srgb, var(--album-accent) 10%, transparent);
  color: var(--album-accent);
  font-size: 14px;
  line-height: 18px;
}

@media (max-width: 767px) {
  .hero {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }

  .cover {
    width: 100%;
    max-width: 280px;
  }

  .name {
    font-size: 32px;
  }
}
```

- [ ] **Step 3: Check the texture path**

Run:

```bash
grep -rn "texture" src/components/StandaloneTrack.module.css && ls public/textures 2>/dev/null
```

Expected: the URL in `.texture` above matches whatever `StandaloneTrack.module.css` uses. If it differs, copy theirs — do not keep the guess.

- [ ] **Step 4: Commit** (with Task 12, since the two must land together)

---

## Task 12: `toPlayerTrack` learns the locale

**Files:**
- Modify: `src/player/PlayerProvider.tsx:65-85`
- Modify: `src/components/AlbumTrack.tsx:48`
- Modify: `src/components/StandaloneTrack.tsx:44`

The player's expanded drawer shows `current.description`, which is resolved once, when the track is queued. So the locale has to reach `toPlayerTrack`.

- [ ] **Step 1: Take a locale**

Replace the function:

```ts
/**
 * Map a `track_overview` row (with a playable URL) to a queue entry. Lyrics
 * live outside the view, so callers that have them (the album page) pass them
 * in; they default to null so the player's Lyrics action simply stays hidden.
 * The blurb is resolved to the caller's locale here, once, because the player
 * keeps queue entries rather than rows.
 */
export function toPlayerTrack(
  track: Track,
  lyrics: string | null = null,
  locale: Locale = DEFAULT_LOCALE
): PlayerTrack {
  return {
    id: track.track_id,
    name: track.track_name,
    url: track.latest_resource_url!,
    albumId: track.album_id,
    albumName: track.album_name,
    coverUrl: track.album_cover_url,
    theme: track.album_theme ?? null,
    description: localized(
      track.track_description,
      track.track_description_fr,
      locale
    ),
    lyrics,
  };
}
```

and add to the imports at the top of the file:

```ts
import { DEFAULT_LOCALE, localized, type Locale } from "@/lib/i18n/config";
```

- [ ] **Step 2: Pass the locale from `AlbumTrack`**

Add the hook near the other hooks in the component body:

```ts
  const locale = useLocale();
```

with `import { useLocale } from "@/lib/i18n/LocaleProvider";` at the top, and change the queue mapping:

```ts
      playableTracks.map((t) =>
        toPlayerTrack(t, queueLyrics?.[t.track_id] ?? null, locale)
      ),
```

- [ ] **Step 3: Pass the locale from `StandaloneTrack`**

The same `useLocale()` import and hook, then:

```ts
      playableTracks.map((t) => toPlayerTrack(t, null, locale)),
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS — including `TrackHero` from Task 11, whose `toPlayerTrack(track, lyrics, locale)` call now type-checks.

- [ ] **Step 5: Commit**

```bash
git add src/player/PlayerProvider.tsx src/components/AlbumTrack.tsx src/components/StandaloneTrack.tsx src/components/TrackHero.tsx src/components/TrackHero.module.css
git commit -m "Give the track page a hero and queue blurbs in the reader's language"
```

---

## Task 13: The track page

**Files:**
- Create: `src/app/tracks/[id]/page.tsx`, `src/app/tracks/[id]/page.module.css`
- Create: `src/app/tracks/[id]/opengraph-image.tsx`, `src/app/tracks/[id]/twitter-image.tsx`

Mirror `src/app/albums/[id]/` — read `page.tsx`, `page.module.css` and `opengraph-image.tsx` there first.

- [ ] **Step 1: Write the page**

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import PaletteScope from "@/components/PaletteScope";
import Prose from "@/components/Prose";
import TrackHero from "@/components/TrackHero";
import { getTrack } from "@/lib/data";
import { getLocale } from "@/lib/i18n";
import { localized } from "@/lib/i18n/config";
import styles from "./page.module.css";

export const revalidate = 300;

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const page = await getTrack(id);
  if (!page) return { title: "Bohns — Melogram" };

  const { track } = page;
  const locale = await getLocale();
  const title = `${track.track_name} — Bohns`;
  const description =
    localized(track.track_description, track.track_description_fr, locale) ??
    `${track.track_name} on Melogram.`;
  // The cover image comes from the opengraph-image / twitter-image routes;
  // here we only enrich the surrounding card text.
  return {
    title,
    description,
    openGraph: { title, description, type: "music.song" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function TrackPage({ params }: Props) {
  const { id } = await params;
  const page = await getTrack(id);
  if (!page) notFound();

  const { track, album, lyrics } = page;
  const locale = await getLocale();
  const story = localized(track.track_story, track.track_story_fr, locale);

  return (
    <div className={styles.page}>
      <Header variant="compact" />
      <PaletteScope
        album={{
          id: album?.id,
          name: album?.name,
          theme: album?.theme,
          coverUrl: track.album_cover_url,
        }}
      >
        <article className={styles.content}>
          <TrackHero track={track} lyrics={lyrics} />
          {story && <Prose markdown={story} />}
        </article>
      </PaletteScope>
    </div>
  );
}
```

- [ ] **Step 2: Check `AlbumColorSource`**

Run:

```bash
grep -n -A 12 "AlbumColorSource" src/lib/albumPalette.ts | head -30
```

Expected: the object passed to `PaletteScope` above satisfies it (`StandaloneTrack.tsx:25-30` builds the same shape). Adjust the property names to match if they differ.

- [ ] **Step 3: Write the page styles**

```css
.page {
  max-width: 1440px;
  margin-inline: auto;
  padding: 72px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.content {
  max-width: 800px;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

@media (max-width: 767px) {
  .page {
    padding: 0 24px 48px;
    gap: 16px;
  }

  .content {
    gap: 24px;
  }
}
```

- [ ] **Step 4: Write the share image routes**

`src/app/tracks/[id]/opengraph-image.tsx`:

```tsx
import { getTrackAlbumBasics } from "@/lib/data";
import {
  renderAlbumImage,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/albumImage";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Track cover on Melogram";
// Cache the generated image; covers change rarely and rendering is not cheap.
export const revalidate = 3600;

type Props = { params: Promise<{ id: string }> };

export default async function Image({ params }: Props) {
  const { id } = await params;
  return renderAlbumImage(await getTrackAlbumBasics(id));
}
```

`src/app/tracks/[id]/twitter-image.tsx` — a separate file rather than a re-export, because route-segment config like `revalidate` must be a statically analysable literal:

```tsx
import { getTrackAlbumBasics } from "@/lib/data";
import {
  renderAlbumImage,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/albumImage";

// Twitter/X share image — same renderer as the Open Graph image. Kept as its
// own file (rather than re-exporting) because route-segment config such as
// `revalidate` must be a statically-analysable literal export.
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Track cover on Melogram";
export const revalidate = 3600;

type Props = { params: Promise<{ id: string }> };

export default async function Image({ params }: Props) {
  const { id } = await params;
  return renderAlbumImage(await getTrackAlbumBasics(id));
}
```

- [ ] **Step 5: Verify in the browser**

Run: `npm run build && npm run dev`

Then, with a track id taken from the home page:

- `/tracks/<id>` renders hero + prose, wearing the album's palette.
- Play, like and the lyrics button all work; the player bar picks the track up.
- The album name links back to `/albums/<id>`.
- `/tracks/does-not-exist` renders the 404.
- A **versionless** track's id also 404s (find one in Supabase: a `tracks` row with no `track_versions` link).
- Switch the language in the account menu: French prose and blurb appear where they exist, English where they don't.

Expected: all of the above. The prose is today's seeded copy of the description — that is correct at this phase.

- [ ] **Step 6: Commit**

```bash
git add "src/app/tracks"
git commit -m "Give every track a page of its own"
```

---

## Task 14: Link the track names

**Files:**
- Modify: `src/components/StandaloneTrack.tsx:61-69`
- Modify: `src/components/AlbumTrack.tsx:68-70`
- Modify: `src/components/PlayerBar.tsx:288-297`

The play control stays a separate element in each — a click must never be ambiguous about whether it navigates or plays.

- [ ] **Step 1: Link the name in `StandaloneTrack`**

Add `import Link from "next/link";` and replace the name span:

```tsx
          <Link
            href={`/tracks/${track.track_id}`}
            className={`${styles.name} ${active ? "shimmer" : ""}`}
          >
            {track.track_name}
          </Link>
```

- [ ] **Step 2: Link the name in `AlbumTrack`**

Add `import Link from "next/link";` and replace the name span:

```tsx
      <Link
        href={`/tracks/${track.track_id}`}
        className={`${styles.name} ${active ? "shimmer" : ""}`}
      >
        {track.track_name}
      </Link>
```

- [ ] **Step 3: Keep the names looking like names**

Both `.name` rules must not inherit the global link styling. Add to `.name` in `StandaloneTrack.module.css` **and** in `AlbumTrack.module.css`:

```css
  color: inherit;
  text-decoration: none;
}

.name:hover,
.name:focus-visible {
  text-decoration: underline;
  text-underline-offset: 3px;
```

(That is: append the first two declarations to the existing `.name` rule, then add the `:hover, :focus-visible` rule after it.)

- [ ] **Step 4: Add the Track link to the player drawer**

In `PlayerBar.tsx`, inside `.expandActions`, **before** the existing Album link:

```tsx
                {current?.id && (
                  <Link
                    href={`/tracks/${current.id}`}
                    className={styles.expandButton}
                    onClick={() => setExpanded(false)}
                  >
                    <Music size={16} strokeWidth={2} aria-hidden />
                    {m.player.track}
                  </Link>
                )}
```

and add `Music` to the existing `lucide-react` import.

- [ ] **Step 5: Verify in the browser**

Run: `npm run dev`
Expected: track names navigate to the new page from the home rails, the album rows and the player's expanded drawer; the play buttons still play; keyboard focus shows the underline.

- [ ] **Step 6: Commit**

```bash
git add src/components/StandaloneTrack.tsx src/components/StandaloneTrack.module.css src/components/AlbumTrack.tsx src/components/AlbumTrack.module.css src/components/PlayerBar.tsx
git commit -m "Let a track name lead to its page"
```

---

## Task 15: Localize the read surfaces

**Files:**
- Modify: `src/components/StandaloneTrack.tsx:75-77`
- Modify: `src/components/AlbumTrack.tsx:90-92`
- Modify: `src/components/AlbumCard.tsx:34-36`
- Modify: `src/components/AlbumDetailCard.tsx:103-107`

Every one of these is already a client component, so each reads the locale from the provider.

- [ ] **Step 1: `StandaloneTrack`**

Add the imports:

```ts
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { localized } from "@/lib/i18n/config";
```

(`useLocale` is already imported if Task 12 touched this file — do not import it twice.) In the component body:

```ts
  const description = localized(
    track.track_description,
    track.track_description_fr,
    locale
  );
```

and render `{description && <p className={styles.description}>{description}</p>}`.

- [ ] **Step 2: `AlbumTrack`**

The same, with the render becoming:

```tsx
      {detailed && description && (
        <p className={styles.description}>{description}</p>
      )}
```

- [ ] **Step 3: `AlbumCard`**

`AlbumCard.tsx` has no `"use client"` directive, but it is imported by `AlbumsSection.tsx:8`, which does — so it already compiles into the client bundle and may use hooks. Add the directive to make that explicit, then the same two imports and hook as Step 1:

```tsx
"use client";

import Link from "next/link";
import type { AlbumWithTracks } from "@/lib/types";
import { displayGenre } from "@/lib/genres";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { localized } from "@/lib/i18n/config";
```

In the component body:

```tsx
export default function AlbumCard({ album }: { album: AlbumWithTracks }) {
  const locale = useLocale();
  const description = localized(album.description, album.description_fr, locale);
```

and the render:

```tsx
        {description && <p className={styles.description}>{description}</p>}
```

No call site changes — the prop list is unchanged.

- [ ] **Step 4: `AlbumDetailCard`**

It is a client component. Add `useLocale` / `localized` as in Step 1, then in the read branch:

```tsx
            localized(album.description, album.description_fr, locale) && (
              <p className={styles.description}>
                {localized(album.description, album.description_fr, locale)}
              </p>
            )
```

Leave the **edit** branch alone — Task 18 rebuilds it.

- [ ] **Step 5: Verify in the browser**

Run: `npx tsc --noEmit && npm run lint && npm run dev`
Expected: PASS, and with the language set to French every description that has a French value shows it, while the rest stay English. No blank descriptions anywhere — a blank means the fallback is inverted.

- [ ] **Step 6: Commit**

```bash
git add src/components
git commit -m "Read every blurb in the visitor's language"
```

---

## Task 16: The album's prose section

**Files:**
- Create: `src/components/AlbumStory.tsx`, `src/components/AlbumStory.module.css`
- Create: `src/components/edit/LocaleTabs.tsx`, `src/components/edit/LocaleTabs.module.css`
- Modify: `src/components/AlbumDetailCard.tsx`

The prose sits **below the tracklist**, inside the card — the album page's job is playing the album; the notes are what you drop into afterwards.

- [ ] **Step 1: Write the locale toggle**

`src/components/edit/LocaleTabs.tsx` — shared with the drawer in Task 17. The edit UI is English-only by convention, so the labels are hardcoded.

```tsx
"use client";

import { LOCALES, type Locale } from "@/lib/i18n/config";
import styles from "./LocaleTabs.module.css";

/**
 * Which language of a bilingual field is being edited. A view concern only —
 * both locales' values stay in the form state and are submitted together,
 * because update_track and update_album overwrite every column.
 */
export default function LocaleTabs({
  value,
  onChange,
  disabled = false,
}: {
  value: Locale;
  onChange: (locale: Locale) => void;
  disabled?: boolean;
}) {
  return (
    <div className={styles.tabs} role="group" aria-label="Editing language">
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          className={`${styles.tab} ${value === locale ? styles.active : ""}`}
          aria-pressed={value === locale}
          disabled={disabled}
          onClick={() => onChange(locale)}
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
```

`src/components/edit/LocaleTabs.module.css`:

```css
.tabs {
  display: inline-flex;
  gap: 4px;
  padding: 3px;
  border-radius: var(--radius-button);
  background: color-mix(in srgb, var(--album-light) 8%, transparent);
  width: fit-content;
}

.tab {
  padding: 4px 12px;
  border-radius: calc(var(--radius-button) - 3px);
  color: var(--album-light);
  opacity: 0.6;
  font-size: 13px;
  line-height: 18px;
  letter-spacing: 0.04em;
}

.tab:hover:not(:disabled),
.tab:focus-visible {
  opacity: 1;
}

.active {
  background: color-mix(in srgb, var(--album-accent) 18%, transparent);
  color: var(--album-accent);
  opacity: 1;
}

.tab:disabled {
  opacity: 0.35;
  cursor: default;
}
```

- [ ] **Step 2: Write the album story section**

`src/components/AlbumStory.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { localized, type Locale } from "@/lib/i18n/config";
import type { Album } from "@/lib/types";
import Prose from "./Prose";
import LocaleTabs from "./edit/LocaleTabs";
import { useAlbumEdit } from "./edit/AlbumEditProvider";
import controls from "./edit/controls.module.css";
import styles from "./AlbumStory.module.css";

/**
 * The album's liner notes, below the tracklist. Read mode renders the markdown
 * for the visitor's language; edit mode swaps in a plain textarea per language
 * (no WYSIWYG) whose value is staged on the album draft and saved with the
 * rest of the card.
 */
export default function AlbumStory({ album }: { album: Album }) {
  const { editing, draft, setField } = useAlbumEdit();
  const locale = useLocale();
  const m = useMessages();
  const [editLocale, setEditLocale] = useState<Locale>("en");

  if (editing) {
    const key = editLocale === "en" ? "story" : "story_fr";
    return (
      <section className={styles.section}>
        <div className={styles.headingRow}>
          <h2 className={styles.heading}>{m.sections.notes}</h2>
          <LocaleTabs value={editLocale} onChange={setEditLocale} />
        </div>
        <textarea
          className={`${controls.textarea} ${styles.editor}`}
          value={draft[key]}
          placeholder="Liner notes — markdown welcome…"
          rows={10}
          aria-label={`Album notes (${editLocale.toUpperCase()})`}
          onChange={(e) => setField(key, e.target.value)}
        />
      </section>
    );
  }

  const story = localized(album.story, album.story_fr, locale);
  if (!story) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{m.sections.notes}</h2>
      <Prose markdown={story} />
    </section>
  );
}
```

`src/components/AlbumStory.module.css`:

```css
.section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 32px;
  border-top: 1px solid color-mix(in srgb, var(--album-light) 8%, transparent);
}

.headingRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.heading {
  font-family: var(--font-gloock), serif;
  font-size: 20px;
  font-weight: 400;
  line-height: 24px;
  color: var(--album-light);
}

.editor {
  min-height: 220px;
  font-family: ui-monospace, monospace;
  font-size: 14px;
  line-height: 22px;
}
```

- [ ] **Step 3: Mount it under the playlist**

In `AlbumDetailCard.tsx`, add `import AlbumStory from "./AlbumStory";` and put it directly after the setlist/playlist branch, before the `{drawer && ...}` block:

```tsx
      <AlbumStory album={album} />
```

- [ ] **Step 4: Verify in the browser**

Run: `npx tsc --noEmit && npm run lint && npm run dev`
Expected: PASS at the type level. The album page shows a **Notes** section under the tracklist with the seeded prose. The `draft.story` reference will not type-check until Task 18 widens the draft — if you are running tasks strictly in order, expect that one error here and resolve it there.

- [ ] **Step 5: Commit**

```bash
git add src/components/AlbumStory.tsx src/components/AlbumStory.module.css src/components/edit/LocaleTabs.tsx src/components/edit/LocaleTabs.module.css src/components/AlbumDetailCard.tsx
git commit -m "Give an album its liner notes below the tracklist"
```

---

## Task 17: The write layer

**Files:**
- Modify: `src/lib/edit.ts:63-107` (`createTrack`, `getTrackDetails`, `updateTrack`), `:14-28` (`updateAlbum`)

The RPC parameter names here must match the migration's exactly — `_description_fr`, `_story`, `_story_fr`. A typo is a silent `null` write that erases text.

- [ ] **Step 1: `createTrack`**

```ts
export async function createTrack(
  albumId: string,
  name: string,
  description: string | null,
  descriptionFr: string | null,
  story: string | null,
  storyFr: string | null,
  lyrics: string | null
): Promise<TrackDetails> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_track", {
    _album_id: albumId,
    _name: name,
    _description: description,
    _description_fr: descriptionFr,
    _story: story,
    _story_fr: storyFr,
    _lyrics: lyrics,
  });
  if (error) throw new Error(error.message);
  return data as TrackDetails;
}
```

- [ ] **Step 2: `getTrackDetails`**

The seed must carry every field the drawer can overwrite — that is the whole point of fetching it fresh:

```ts
/** Authoritative editable fields, fetched fresh so update_track (a full
    overwrite) never clobbers the prose or lyrics with stale props. */
export async function getTrackDetails(trackId: string): Promise<TrackDetails> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tracks")
    .select("id,name,description,description_fr,story,story_fr,lyrics")
    .eq("id", trackId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Track not found");
  return data as TrackDetails;
}
```

- [ ] **Step 3: `updateTrack`**

```ts
export async function updateTrack(
  trackId: string,
  name: string,
  description: string | null,
  descriptionFr: string | null,
  story: string | null,
  storyFr: string | null,
  lyrics: string | null
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("update_track", {
    _track_id: trackId,
    _name: name,
    _description: description,
    _description_fr: descriptionFr,
    _story: story,
    _story_fr: storyFr,
    _lyrics: lyrics,
  });
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 4: `updateAlbum`**

```ts
export async function updateAlbum(
  albumId: string,
  name: string,
  description: string | null,
  descriptionFr: string | null,
  story: string | null,
  storyFr: string | null,
  type: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("update_album", {
    _album_id: albumId,
    _name: name,
    _description: description,
    _description_fr: descriptionFr,
    _story: story,
    _story_fr: storyFr,
    _type: type,
  });
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: FAIL, with errors at the two call sites — `TrackDrawer.tsx` (`updateTrack`, `createTrack`) and `AlbumEditProvider.tsx` (`updateAlbum`). That is the compiler listing exactly what Tasks 18 and 19 must fix.

- [ ] **Step 6: Commit**

```bash
git add src/lib/edit.ts
git commit -m "Send the prose and its translations through the write RPCs"
```

---

## Task 18: The album draft

**Files:**
- Modify: `src/components/edit/AlbumEditProvider.tsx:23-28` (`Draft`), `:57-64` (`draftFrom`), `:136-145` (`albumDirty`), `:203` (the `updateAlbum` call)

- [ ] **Step 1: Widen the draft**

```ts
type Draft = {
  name: string;
  description: string;
  description_fr: string;
  story: string;
  story_fr: string;
  type: string;
  genres: Genre[];
};
```

```ts
function draftFrom(album: AlbumWithTracks): Draft {
  return {
    name: album.name,
    description: album.description ?? "",
    description_fr: album.description_fr ?? "",
    story: album.story ?? "",
    story_fr: album.story_fr ?? "",
    type: album.type ?? "album",
    genres: album.genres,
  };
}
```

- [ ] **Step 2: Widen the dirty check**

Without this, editing only the prose leaves Save disabled and the work is silently lost on cancel:

```ts
    return (
      draft.name !== album.name ||
      draft.description !== (album.description ?? "") ||
      draft.description_fr !== (album.description_fr ?? "") ||
      draft.story !== (album.story ?? "") ||
      draft.story_fr !== (album.story_fr ?? "") ||
      draft.type !== (album.type ?? "album") ||
      a !== b
    );
```

- [ ] **Step 3: Send everything on save**

```ts
        await updateAlbum(
          album.id,
          draft.name,
          draft.description || null,
          draft.description_fr || null,
          draft.story || null,
          draft.story_fr || null,
          draft.type
        );
```

- [ ] **Step 4: Add the French blurb to the card's edit mode**

In `AlbumDetailCard.tsx`, the editing branch currently has one `EditableText` for the description. Wrap it with the locale toggle so the French blurb is reachable — add to the component body:

```ts
  const [descLocale, setDescLocale] = useState<Locale>("en");
```

(with `import { localized, type Locale } from "@/lib/i18n/config";` and `LocaleTabs` imported), and replace the editing branch's description block:

```tsx
            <div className={styles.descriptionEdit}>
              <LocaleTabs value={descLocale} onChange={setDescLocale} />
              <EditableText
                key={descLocale}
                ariaLabel={`Album description (${descLocale.toUpperCase()})`}
                multiline
                value={
                  descLocale === "en" ? draft.description : draft.description_fr
                }
                placeholder="Add a description…"
                onCommit={(v) =>
                  setField(
                    descLocale === "en" ? "description" : "description_fr",
                    v
                  )
                }
                className={styles.description}
              />
            </div>
```

The `key={descLocale}` is load-bearing: `EditableText` seeds its internal state from `value`, so without a remount the French field would open showing the English text.

Add to `AlbumDetailCard.module.css`:

```css
.descriptionEdit {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}
```

- [ ] **Step 4b: Confirm `EditableText` seeds from `value`**

Run:

```bash
grep -n "useState\|value" src/components/edit/EditableText.tsx | head -20
```

Expected: it holds internal state seeded from the `value` prop, which is what makes `key={descLocale}` necessary. If instead it is fully controlled by `value`, the `key` is harmless — leave it in place either way.

- [ ] **Step 5: Verify in the browser**

Run: `npx tsc --noEmit && npm run lint && npm run dev`
Expected: PASS. On an album page in edit mode: the EN/FR toggle swaps the description field; the Notes textarea from Task 16 stages markdown; Save persists; a reload shows both languages preserved. **Check the one that bites**: set a French description, save, reload, then edit again and confirm the English one is still there.

- [ ] **Step 6: Commit**

```bash
git add src/components/edit/AlbumEditProvider.tsx src/components/AlbumDetailCard.tsx src/components/AlbumDetailCard.module.css
git commit -m "Stage and save an album's prose in both languages"
```

---

## Task 19: The track drawer

**Files:**
- Modify: `src/components/edit/TrackDrawer.tsx:24-36` (`Fields`, `EMPTY`, `fieldsFrom`, `orNull`), `:78-84` (`detailsDirty`), `:205-260` (`onSubmitDetails`), `:345-395` (the form)
- Modify: `src/components/edit/controls.module.css`

This is the task the spec's §11 warns about: `update_track` overwrites every column, and the toggle **hides** fields that must still be in the payload. Every value lives in `fields` at all times; the toggle only chooses which one is on screen.

- [ ] **Step 1: Widen the field state**

```ts
type Fields = {
  name: string;
  description: string;
  description_fr: string;
  story: string;
  story_fr: string;
  lyrics: string;
};

const EMPTY: Fields = {
  name: "",
  description: "",
  description_fr: "",
  story: "",
  story_fr: "",
  lyrics: "",
};

function fieldsFrom(track: TrackDetails): Fields {
  return {
    name: track.name,
    description: track.description ?? "",
    description_fr: track.description_fr ?? "",
    story: track.story ?? "",
    story_fr: track.story_fr ?? "",
    lyrics: track.lyrics ?? "",
  };
}
```

- [ ] **Step 2: Add the toggle state and the soft limit**

Near the other `useState` calls:

```ts
  const [editLocale, setEditLocale] = useState<Locale>("en");
```

with `import LocaleTabs from "./LocaleTabs";` and `import type { Locale } from "@/lib/i18n/config";`. Above the component, next to `EMPTY`:

```ts
/** Soft limit on the short blurb. Warns, never blocks: the descriptions are
    being rewritten by hand (design spec §9, phase 2) and the hard constraint
    lands in a later migration. */
const DESCRIPTION_SOFT_LIMIT = 200;
```

- [ ] **Step 3: Widen the dirty check**

```ts
  const detailsDirty = track
    ? fields.name !== track.name ||
      orNull(fields.description) !== track.description ||
      orNull(fields.description_fr) !== track.description_fr ||
      orNull(fields.story) !== track.story ||
      orNull(fields.story_fr) !== track.story_fr ||
      orNull(fields.lyrics) !== track.lyrics
    : fields.name.trim() !== "" ||
      fields.description.trim() !== "" ||
      fields.description_fr.trim() !== "" ||
      fields.story.trim() !== "" ||
      fields.story_fr.trim() !== "" ||
      fields.lyrics.trim() !== "";
```

- [ ] **Step 4: Submit every field**

In `onSubmitDetails`, replace `applySaved` and both RPC calls:

```ts
    const applySaved = (saved: Fields) =>
      setFields((cur) => {
        const keep = <K extends keyof Fields>(key: K): Fields[K] =>
          cur[key] === submitted[key] ? saved[key] : cur[key];
        return {
          name: keep("name"),
          description: keep("description"),
          description_fr: keep("description_fr"),
          story: keep("story"),
          story_fr: keep("story_fr"),
          lyrics: keep("lyrics"),
        };
      });
```

```ts
      if (track) {
        await updateTrack(
          track.id,
          name,
          orNull(submitted.description),
          orNull(submitted.description_fr),
          orNull(submitted.story),
          orNull(submitted.story_fr),
          orNull(submitted.lyrics)
        );
        const next = {
          ...track,
          name,
          description: orNull(submitted.description),
          description_fr: orNull(submitted.description_fr),
          story: orNull(submitted.story),
          story_fr: orNull(submitted.story_fr),
          lyrics: orNull(submitted.lyrics),
        };
        setTrack(next);
        applySaved(fieldsFrom(next));
      } else {
        // Morph into edit mode the moment the row exists — a failed first
        // upload must not leave a create button that would duplicate tracks.
        const row = await createTrack(
          album.id,
          name,
          orNull(submitted.description),
          orNull(submitted.description_fr),
          orNull(submitted.story),
          orNull(submitted.story_fr),
          orNull(submitted.lyrics)
        );
        setTrack(row);
        applySaved(fieldsFrom(row));
      }
```

- [ ] **Step 5: Put the toggle in the form**

Replace the Description field block with the toggle plus the two locale-switched fields. `descKey` / `storyKey` index the same `fields` object — nothing is dropped from state when the toggle flips:

```tsx
          <div className={styles.localeRow}>
            <span className={controls.label}>Description &amp; notes</span>
            <LocaleTabs
              value={editLocale}
              onChange={setEditLocale}
              disabled={!seeded}
            />
          </div>
          <div className={controls.field}>
            <label className={controls.label} htmlFor="track-description">
              Description ({editLocale.toUpperCase()})
            </label>
            <textarea
              id="track-description"
              className={controls.textarea}
              value={fields[descKey]}
              disabled={!seeded}
              placeholder="One or two lines — this is what the strips show…"
              rows={3}
              onChange={(e) =>
                setFields((f) => ({ ...f, [descKey]: e.target.value }))
              }
            />
            <span
              className={`${controls.counter} ${
                overLimit ? controls.counterOver : ""
              }`}
            >
              {fields[descKey].length} / {DESCRIPTION_SOFT_LIMIT}
              {overLimit ? " — long for a strip" : ""}
            </span>
          </div>
          <div className={controls.field}>
            <label className={controls.label} htmlFor="track-story">
              Notes ({editLocale.toUpperCase()})
            </label>
            <textarea
              id="track-story"
              className={`${controls.textarea} ${controls.lyrics}`}
              value={fields[storyKey]}
              disabled={!seeded}
              placeholder="The long version — markdown welcome…"
              rows={8}
              onChange={(e) =>
                setFields((f) => ({ ...f, [storyKey]: e.target.value }))
              }
            />
          </div>
```

with these derived above the `return`:

```ts
  const descKey = editLocale === "en" ? "description" : "description_fr";
  const storyKey = editLocale === "en" ? "story" : "story_fr";
  const overLimit = fields[descKey].length > DESCRIPTION_SOFT_LIMIT;
```

Add to `TrackDrawer.module.css`:

```css
.localeRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
```

- [ ] **Step 6: Style the counter**

Append to `src/components/edit/controls.module.css`:

```css
.counter {
  font-size: 12px;
  line-height: 16px;
  color: var(--album-light);
  opacity: 0.5;
  align-self: flex-end;
}

/* Warns, never blocks — the rewrite is a manual pass, not a form error. */
.counterOver {
  color: #e8b04b;
  opacity: 1;
}
```

- [ ] **Step 7: Verify in the browser — the destructive case first**

Run: `npx tsc --noEmit && npm run lint && npm run dev`

On an album page in edit mode, open a track:

1. Type an English description, flip to **FR**, type a French one, Save.
2. **Reload the page and reopen the drawer.** Both languages are still there.
3. Flip to FR, edit **only** the French notes, Save, reload: the English notes are unchanged.

Expected: all three. Step 3 failing means a locale is being dropped from the payload — the exact bug §11 of the spec warns about. Nothing else in this task matters until it passes.

Then: the counter turns amber past 200 characters and **Save stays enabled**.

- [ ] **Step 8: Commit**

```bash
git add src/components/edit/TrackDrawer.tsx src/components/edit/TrackDrawer.module.css src/components/edit/controls.module.css
git commit -m "Edit a track's blurb and notes in both languages"
```

---

## Task 20: Documentation and the PR

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document the page**

In the **Pages** list, after the `/albums/[id]` entry:

```markdown
- `/tracks/[id]` — a track's own page: cover, name, album link and playback
  controls, then its long-form notes (markdown) and a lyrics sheet
```

- [ ] **Step 2: Document the content model**

In **Design notes**:

```markdown
- Track and album copy comes in two fields: `description`, a short blurb for the
  strips and rows (kept under 200 characters), and `story`, long-form markdown
  shown on the track and album pages. Both are bilingual — a `_fr` column
  alongside each, resolved by `localized()` in `src/lib/i18n/config.ts`, falling
  back to English when a French value is missing.
```

- [ ] **Step 3: Full verification**

Run:

```bash
npm run lint && npm run build
```

Expected: both PASS.

Then walk the whole surface once in `npm run dev`, in **both** languages:

- Home: rails clamp to two lines; track names link out.
- `/tracks/[id]`: hero, prose, lyrics, play, like.
- `/albums/[id]`: localized blurb, Notes under the tracklist.
- Edit mode: track drawer round-trip across EN/FR; album description and notes round-trip.
- Player: queue a track, expand the drawer, follow the Track link.

- [ ] **Step 4: Commit and push**

```bash
git add README.md
git commit -m "Document the track page and the bilingual content fields"
git push -u origin bilingual-prose-track-page
```

- [ ] **Step 5: Open the PR with a Lab Note**

This ships something a listener notices, so `CLAUDE.md` requires a Lab Note section in the PR body. The molecule slug for this repo is `melogram`.

```bash
gh pr create --title "Give tracks their own page and write in two languages" --body "$(cat <<'BODY'
Splits `description` into a short blurb plus long-form markdown `story` on both
tracks and albums, makes all four fields bilingual (en/fr), and adds
`/tracks/[id]` where the prose lives. The home rails now clamp to two lines, so
they read as one strip whatever a blurb's length.

Phase 1 of three: `story` is seeded from today's descriptions, the 200-character
rule on `description` warns but does not block, and the hard constraint lands in
a later PR once the copy has been rewritten.

Spec: `docs/superpowers/specs/2026-09-19-bilingual-prose-and-track-page-design.md`
Plan: `docs/superpowers/plans/2026-09-19-bilingual-prose-and-track-page.md`

**The migration is applied by hand** — `supabase/migrations/20260919000000_bilingual_prose.sql`
must be run in the Supabase SQL editor before this merges, or every track read breaks.

## Lab Note

```yaml
en:
  title: Every track now has a page of its own
  summary: Tap a track's name and you land on its own page — the cover, the play button, and the story behind the song, at whatever length it deserves. The lists stay tidy and short.
fr:
  title: Chaque morceau a désormais sa page
  summary: Touche le nom d'un morceau et tu arrives sur sa page — la pochette, le bouton play, et l'histoire de la chanson, aussi longue qu'elle mérite de l'être. Les listes, elles, restent courtes et nettes.
suggested:
  molecule: melogram
  type: feature
  tags: [changelog]
```

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```

---

## Notes for whoever executes this

- **Tasks 3 and 4 block on Alexis.** Ask, then wait. Do not synthesize a view definition, and do not route around it with another `attach*` helper — the spec rejected that on purpose.
- **Tasks 11/12 and 16/18 are deliberately coupled.** Each pair leaves the tree red in between; the plan says so at the step where it happens. Do not "fix" the red by inventing a stub.
- **The one bug to fear** is a locale dropped from a full-overwrite payload. It is silent, it destroys text the user wrote, and Task 19 Step 7 is the check that catches it. Run it.
