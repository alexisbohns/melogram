# Bilingual Prose & the Track Page — Design Spec

**Date:** 2026-09-19
**Status:** Approved design → ready for implementation planning
**Author:** Alexis (with Claude)

## 1. Problem

`tracks.description` is a single plain-text column doing two incompatible jobs.
It is the blurb in the home strips and the album rows, *and* it is the only
place to write anything at length about a track. The result is visible on the
home page: some strip items carry one line, others carry a paragraph, and the
rails look ragged.

There is also nowhere to read about a track. `/albums/[id]` exists; a track has
no page of its own, so prose about a single song has no home.

Finally, all catalog content is monolingual. The app ships an en/fr locale
switch (`NEXT_LOCALE` cookie → `src/lib/i18n`), but it only translates UI
strings — every description is written once, in one language.

## 2. Goals & scope

**In scope (this build — "phase 1"):**

- Split the two jobs into two fields on **both** `tracks` and `albums`:
  `description` (short, strips and rows) and `story` (long, markdown, pages).
- Make both fields **bilingual** (en + fr), via suffixed columns.
- A real **`/tracks/[id]` page**: track-first hero, then the prose.
- Render `story` as **markdown** (`react-markdown` + `remark-gfm`).
- An album prose section on `/albums/[id]`, below the tracklist.
- **Clamp** the strips to two lines so uniformity lands immediately.
- Editors for the new fields, with a **soft** 200-character warning.

**Out of scope (explicitly deferred):**

- **Enforcing** the 200-character rule — that is phase 3 (§9), after Alexis has
  rewritten the copy.
- Translating `lyrics`. Lyrics are the words of the song; they stay monolingual.
- A third locale. `LOCALES` is a two-element tuple and the schema commits to it.
- WYSIWYG markdown editing — plain textareas.
- A test framework. The repo has none; verification is lint + build + manual
  (§10).

## 3. Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Field split | **Two fields**, not one truncated | The strips get uniform because the field is short *by contract*, not because CSS hides the overflow |
| Long-field name | **`story`** | `description` keeps its name and its meaning narrows to "the short one" |
| Bilingual storage | **Suffixed columns** (`description_fr`, `story_fr`) | Exactly two locales, hardcoded in the app as a closed set; a `_fr` column is honest about that. JSONB and a side table buy extensibility that has not been asked for, at real cost in the RPCs and the drawers |
| Fallback | **`fr ?? en`, silently** | No "untranslated" badge; a missing French value just reads in English |
| Entities | **Tracks *and* albums** | Both have the same two-jobs problem |
| Track page shape | **Hero → prose**, lyrics via the existing sheet | The page's first job is still playing the track |
| Album prose placement | **Below the playlist** | The album page's job is playing the album; the notes are what you drop into afterwards |
| Markdown renderer | **`react-markdown` + `remark-gfm`** | Prose written by hand and rendered on a page; a maintained renderer is the boring correct answer. The subset used is a styling decision, not a parsing one |
| Raw HTML | **Not enabled** (no `rehype-raw`) | Nothing in liner notes needs it; escaping is the safe default |
| `lyrics` | **Unchanged**, monolingual | |
| 200-char rule | **Soft now, enforced in phase 3** | Nothing blocks Alexis mid-rewrite |

## 4. Data model

One migration, `supabase/migrations/20260919000000_bilingual_prose.sql`:

```sql
alter table public.tracks
  add column description_fr text,
  add column story          text,
  add column story_fr       text;

alter table public.albums
  add column description_fr text,
  add column story          text,
  add column story_fr       text;

-- Phase 1 seed: today's descriptions ARE the prose. Nothing is lost; the short
-- descriptions are rewritten by hand afterwards (phase 2).
update public.tracks set story = description where description is not null;
update public.albums set story = description where description is not null;
```

No `check` constraint here — see §9.

### RPC signatures

`create_track`, `update_track`, `create_album` and `update_album` each gain
parameters. Postgres **overloads** rather than replaces when a signature
changes, so every one needs an explicit `drop function` of the old signature
before the `create or replace`, or the PostgREST call becomes ambiguous:

```sql
drop function if exists public.update_track(uuid, text, text, text);

create or replace function public.update_track(
  _track_id       uuid,
  _name           text,
  _description    text,
  _description_fr text,
  _story          text,
  _story_fr       text,
  _lyrics         text
) returns public.tracks ...
```

Parameter order is **English then French, description then story**, consistently
across all four. The membership guards are unchanged. `update_*` remains a full
overwrite, which is why `TrackDrawer` must keep seeding from an authoritative
fetch (see §8).

### The `track_overview` view

The view's definition is **not in the repo** — it predates the migrations
folder. The migration therefore includes a `create or replace view
public.track_overview` reconstructed from a `pg_get_viewdef` dump that Alexis
supplies, with three columns added: `track_description_fr`, `track_story`,
`track_story_fr`.

**This is a blocking input.** Implementation of the view portion cannot start
without the dump; everything else in the migration can.

Committing the recovered definition also closes a real gap — the view is
currently unversioned and undocumented, and the data layer already works around
its omissions twice (`attachDurations`, `attachThemesFromAlbums`). A third
workaround would be cargo cult.

## 5. Locale resolution

A client-safe helper in `src/lib/i18n/config.ts` (never `./index`, which imports
`next/headers`):

```ts
export function localized(
  en: string | null,
  fr: string | null,
  locale: Locale
): string | null {
  return (locale === "fr" ? fr : null) ?? en;
}
```

The data layer stays **locale-agnostic** and returns every column. Resolution
happens at the point of render:

- **Client components** — `useLocale()` from `@/lib/i18n/LocaleProvider`:
  `StandaloneTrack`, `AlbumTrack`, `AlbumCard`, `AlbumDetailCard`, `PlayerBar`.
- **Server** — `getLocale()` from `@/lib/i18n`: the pages and every
  `generateMetadata`.

`Track` and `Album` in `src/lib/types.ts` gain the raw columns
(`track_description_fr`, `track_story`, `track_story_fr`, and
`description_fr` / `story` / `story_fr`). `ALBUM_COLS` and `TRACK_COLS` in
`src/lib/data.ts` grow to match.

## 6. `/tracks/[id]`

A new server component at `src/app/tracks/[id]/page.tsx`, `revalidate = 300`,
mirroring the album page's shape.

- **Hero** — cover, track name, album name linking to `/albums/[id]`, play
  button, `LikeButton`, duration.
- **Prose** — the localized `story`, rendered through `<Prose>`.
- **Lyrics** — a button opening the existing `LyricsSheet`, unchanged.
- Wrapped in `PaletteScope` with the album's palette, so the page wears the
  album's colors like every other surface.
- `generateMetadata` uses the **localized short `description`**, with
  `` `${track.name} on Melogram.` `` as the fallback, matching the album page.
- `opengraph-image.tsx` / `twitter-image.tsx` reuse `src/lib/og/albumImage.tsx`
  with the album's cover.

New data function `getTrack(id)` in `src/lib/data.ts`: the `track_overview` row,
plus `lyrics`, plus the album row for the palette. Returns null for a missing
track; the page calls `notFound()`.

**Versionless tracks 404 for listeners.** `hasVersion()` already governs public
visibility everywhere else, and the track page must not become the one door
around it.

## 7. Markdown rendering

A new `src/components/Prose.tsx` + `Prose.module.css`, used by both pages:

- `react-markdown` with `remark-gfm`, rendered server-side.
- An explicit component map: headings demoted (`#` → `h2`, `##` → `h3`) so the
  page's own `h1` stays unique; external links get `rel="noreferrer"`.
- No `rehype-raw`. Raw HTML in the source is escaped, not executed.
- Styling covers what liner notes actually use: paragraphs, emphasis, links,
  lists, blockquotes, headings.

## 8. Reading and editing surfaces

### Strips

`line-clamp: 2` on `.description` in `StandaloneTrack.module.css`,
`AlbumTrack.module.css` and `AlbumCard.module.css`. Uniformity lands before a
single word is rewritten.

Track names become links to `/tracks/[id]` — in the strips, the album rows and
the player drawer. The play affordance stays a **separate** control in each, so
a click is never ambiguous about whether it navigates or plays.

### `TrackDrawer`

Three fields become six, which is a wall. Instead, an **EN / FR segmented
toggle** sits above the `description` + `story` pair and swaps which locale is
being edited. `name` and `lyrics` sit outside the toggle.

All six values live in the existing `Fields` state and are submitted together —
the toggle is a view concern only, never a second save. `fieldsFrom` and the
`detailsDirty` comparison grow to cover the new fields; `update_track` is a full
overwrite, so a field the toggle is currently hiding must still be in the
payload.

A character counter under `description` turns amber past 200. **It warns; it
does not block** — phase 2 is Alexis's to do at their own pace.

### Album prose

`AlbumDetailCard`'s inline-edit pattern does not suit a long textarea. The album
prose section on `/albums/[id]` becomes editable in place in edit mode: the same
EN/FR toggle, a plain markdown textarea, committing through `update_album`.
`AlbumEditProvider`'s `draft` grows to carry `description_fr`, `story` and
`story_fr`, and its dirty check with it.

## 9. Phasing

The 200-character rule ships in three steps, because the middle one is manual.

1. **Phase 1 — this build.** Schema, RPCs, view, reads, track page, prose
   rendering, clamps, editors, soft counter. Descriptions are still long; the
   clamp hides it; `story` holds a copy of every one of them.
2. **Phase 2 — Alexis.** Rewrite every `description` under 200 characters and
   write the French for both fields. No code involved.
3. **Phase 3 — a separate, small PR.** Add
   `check (char_length(description) <= 200)` on both tables and both locale
   columns, and flip the editor counter from warning to blocking.

## 10. Verification

The repo has no test runner, and adding one is out of scope. Verification is:

- `npm run lint` and `npm run build` clean.
- A track page renders hero, prose and lyrics; a versionless track 404s.
- An album page renders the prose below the playlist.
- Both locales: French content where present, silent English fallback where not.
- A `TrackDrawer` round-trip across the EN/FR toggle does not lose the hidden
  locale's values.
- The home strips clamp to two lines with today's long descriptions.

## 11. Risks

- **The view dump.** The one step reconstructing something not visible from the
  repo. If the recovered definition is wrong, track reads break broadly. It is
  applied and checked against a `select *` before anything else lands on it.
- **RPC signature churn.** Dropping and recreating four functions is a
  breaking change to the live API surface; the app and the migration must ship
  together.
- **Full-overwrite updates.** The EN/FR toggle hides fields that are still in
  the payload. Getting this wrong silently destroys the other locale's text —
  called out in §8 for exactly that reason.
