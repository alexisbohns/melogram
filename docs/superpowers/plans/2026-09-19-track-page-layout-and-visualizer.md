# Track Page Layout & Song Visualizer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/tracks/[id]` look like it belongs in this app — a two-column layout mirroring the album page, a hero built like the album hero, and a song visualizer drawing a real waveform from peaks precomputed at upload rather than audio decoded in the browser.

**Architecture:** A new `versions.waveform_peaks real[]` column, written on upload and backfilled by script, read only by `getTrack`. The page becomes a 400px aside (album context + tracklist) beside the track column (hero → visualizer → prose). `renderWaveform` moves out of `PlayerBar` into a shared module so the idle canvas and the live wavesurfer draw identically.

**Tech Stack:** Next.js 16 (App Router, RSC), TypeScript, CSS Modules, Supabase (RPC + Storage), wavesurfer.js, Web Audio API, ffmpeg (backfill only).

**Spec:** `docs/superpowers/specs/2026-09-19-track-page-layout-and-visualizer-design.md`

---

## Standing instructions for every task

**Do not invent CSS.** The previous increment shipped a play button that was a
56px circle in an app whose play buttons are all 40px rounded squares, because a
plan author wrote CSS from imagination. Every visual treatment in this plan
either (a) quotes an existing rule to copy, or (b) is marked **NEW**. If a task
tells you to "match X", open X and copy it — do not approximate from the
description. If what you find differs from what this plan claims, **report it**
rather than silently reconciling.

**Verification, every task:** `npx tsc --noEmit`, then `npm run lint` — baseline
is 10 errors / 814 warnings, ALL from `.vercel/output/**`; confirm you add none
— then `npm run build`. There is **no test runner** in this repo; do not create
test files and do not add a test framework.

**Browser checks:** if you cannot drive a browser, say so plainly and never
claim otherwise. You can always verify over HTTP with `curl` against
`npm run dev`, and you should. Stop the dev server when done.

**Branch:** `bilingual-prose-track-page`, already pushed as PR #131.

---

## Task 1: Store waveform peaks

**Files:**
- Create: `supabase/migrations/20260919010000_waveform_peaks.sql`

- [ ] **Step 1: Write the migration**

Read `supabase/migrations/20260712001200_version_duration.sql` first — this is
the same shape, for the same reason, and its header comment explains why.

```sql
-- Store each version's waveform so the client no longer has to download and
-- decode the audio to draw one. Same reasoning as duration_seconds (see
-- 20260712001200_version_duration.sql): sniffing audio in the browser flooded
-- pages with media requests — infinite spinners, device heat, stolen audio
-- sessions, and iOS WebContent OOM crashes. A track page that decoded its song
-- just to paint a waveform would walk straight back into it.
--
-- 512 absolute-value buckets, normalized 0..1 — enough resolution for any width
-- the app renders, a few KB per version. Written on upload by set_version_file
-- and backfilled for existing rows by scripts/backfill-version-waveforms.mjs.

alter table public.versions
  add column if not exists waveform_peaks real[];

-- set_version_file gains an optional _peaks. Drop the 3-arg signature first so
-- PostgREST doesn't see two overloads (calls without _peaks would become
-- ambiguous) — the same hazard this function already hit when _duration was
-- added. coalesce preserves existing peaks when a caller omits them.
drop function if exists public.set_version_file(uuid, text, real);

create or replace function public.set_version_file(
  _version_id   uuid,
  _resource_url text,
  _duration     real default null,
  _peaks        real[] default null
) returns void
  language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.is_member_of_version(_version_id) then
    raise exception 'not a member of this version''s artist' using errcode = '42501';
  end if;
  update public.versions
    set resource_url     = _resource_url,
        duration_seconds = coalesce(_duration, duration_seconds),
        waveform_peaks   = coalesce(_peaks, waveform_peaks)
    where id = _version_id;
end $$;

revoke all on function public.set_version_file(uuid, text, real, real[]) from public;
grant execute on function public.set_version_file(uuid, text, real, real[]) to authenticated;
```

- [ ] **Step 2: Check the dropped signature against the original**

Run:

```bash
grep -n "set_version_file" supabase/migrations/20260712001200_version_duration.sql
```

Expected: the existing function is `(uuid, text, real)` and the `drop` above
names it exactly. A mismatch leaves a stale overload and uploads break. Report
what you found.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260919010000_waveform_peaks.sql
git commit -m "Store a waveform per version"
```

- [ ] **Step 4: Hand the migration to Alexis**

It is applied by hand in the Supabase SQL editor (no CLI in this project). Note
for whoever runs it: Studio resolves a whole pasted buffer against the catalog
before executing, so **run the `alter table` on its own first**, then the
function block. Ask, then wait — later tasks need the column live.

---

## Task 2: Compute peaks on upload

**Files:**
- Modify: `src/lib/edit.ts` — `uploadToPath`, plus a new `audioPeaksFromFile`

- [ ] **Step 1: Add the decoder**

Next to the existing `audioDurationFromFile` (which uses an `<audio>` element
for metadata and stays exactly as it is), add:

```ts
/** Bars stored per version — see the waveform_peaks migration. */
const PEAK_COUNT = 512;

/**
 * Downsample a file's first channel to {@link PEAK_COUNT} absolute-value
 * buckets, normalized 0..1, for the stored waveform. Decoding a whole song is
 * fine here: it happens once, on the artist's machine, at upload. It must never
 * happen on a listener's page view — that is the whole point of storing this.
 *
 * Degrades to null (unsupported browser, undecodable file); a version without
 * peaks still uploads and simply has no idle waveform.
 */
async function audioPeaksFromFile(file: File): Promise<number[] | null> {
  const Ctx =
    typeof window === "undefined"
      ? undefined
      : window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
  if (!Ctx) return null;

  const ctx = new Ctx();
  try {
    const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
    const data = buffer.getChannelData(0);
    const bucket = Math.floor(data.length / PEAK_COUNT) || 1;
    const peaks: number[] = [];
    let max = 0;
    for (let i = 0; i < PEAK_COUNT; i += 1) {
      let peak = 0;
      const start = i * bucket;
      for (let j = start; j < start + bucket && j < data.length; j += 1) {
        const value = Math.abs(data[j]);
        if (value > peak) peak = value;
      }
      peaks.push(peak);
      if (peak > max) max = peak;
    }
    // Normalize so quiet masters still fill the bar height.
    return max > 0 ? peaks.map((p) => p / max) : peaks;
  } catch {
    return null;
  } finally {
    void ctx.close();
  }
}
```

- [ ] **Step 2: Send them with the file**

In `uploadToPath`, alongside the existing duration call:

```ts
  const duration = await audioDurationFromFile(file);
  const peaks = await audioPeaksFromFile(file);
```

and add `_peaks: peaks,` to the `set_version_file` RPC arguments.

- [ ] **Step 3: Verify and commit**

Run the standing verification. The upload path cannot be exercised without
signing in as an artist member and uploading a file — do NOT claim to have
tested it end to end. Type-checking plus a careful read of the RPC argument
names against the Task 1 migration is what is expected here; state that plainly.

```bash
git add src/lib/edit.ts
git commit -m "Compute a waveform when a recording is uploaded"
```

---

## Task 3: Backfill the existing versions

**Files:**
- Create: `scripts/backfill-version-waveforms.mjs`

- [ ] **Step 1: Read the sibling script**

`scripts/backfill-version-durations.mjs` is the template. Copy its structure
exactly: the same `.env.local` → `.env` → real-env resolution with the same
diagnostics, the same argument form (`node script.mjs <URL> <SERVICE_ROLE_KEY>`),
the same re-runnable contract (only rows where the target column is null), the
same "log and skip" behaviour for files that fail.

- [ ] **Step 2: Write it**

Differences from the durations script, and only these:

- Selects `id, resource_url` from `versions` where `waveform_peaks is null` and
  `resource_url is not null`.
- Decodes with **ffmpeg** rather than parsing an MP4 atom — peaks need real
  decoding, there is no header shortcut. Download each file to a temp path, then:

```js
// 8 kHz mono float32 PCM on stdout — plenty for 512 buckets, and small.
const args = ["-v", "error", "-i", path, "-ac", "1", "-ar", "8000",
              "-f", "f32le", "-"];
```

  Bucket the resulting `Float32Array` into 512 absolute-value peaks normalized
  0..1 — the same shape `audioPeaksFromFile` produces in `src/lib/edit.ts`, so
  read that and match it exactly.
- Writes back with `.update({ waveform_peaks: peaks })` on `versions` (the
  service-role key bypasses RLS, as in the sibling script).
- Fails helpfully if `ffmpeg` is not on PATH: check once up front and exit with
  an instruction to install it, rather than failing per-file.

Head the file with a comment explaining why peaks are stored at all, pointing at
the migration.

- [ ] **Step 3: Run it**

`ffmpeg` is available. Run it for real against the live project — this is a
one-off data task and the point is that it works:

```bash
node scripts/backfill-version-waveforms.mjs
```

Report how many rows it wrote and how many it skipped. Then verify over the REST
API that `waveform_peaks` is populated and has length 512 for a known version,
and report the actual numbers.

- [ ] **Step 4: Commit**

```bash
git add scripts/backfill-version-waveforms.mjs
git commit -m "Backfill waveforms for the existing recordings"
```

---

## Task 4: Read peaks for one track

**Files:**
- Modify: `src/lib/types.ts` — `Track`
- Modify: `src/lib/data.ts` — `getTrack`

- [ ] **Step 1: Add the field**

On `Track`, next to `duration`:

```ts
  /**
   * Stored waveform of the latest version (512 values, 0..1), attached ONLY by
   * getTrack — the track page draws it. Deliberately not attached by
   * attachDurations: that runs for every track on the home and album pages, and
   * 512 floats per row would bloat those payloads for a wave nobody draws there.
   */
  peaks?: number[] | null;
```

- [ ] **Step 2: Fetch them in `getTrack`**

`getTrack` currently calls `attachDurations(supabase, [track])`. Leave that
function alone — it is shared. Add a single extra read for this one track's
latest version:

```ts
  if (track.latest_version_id) {
    const { data: version } = await supabase
      .from("versions")
      .select("waveform_peaks")
      .eq("id", track.latest_version_id)
      .maybeSingle();
    track.peaks = (version?.waveform_peaks as number[] | null) ?? null;
  }
```

- [ ] **Step 3: Verify and commit**

Standing verification, plus over HTTP: fetch `/tracks/06bee706-d703-4b75-bb0d-6970c37f7c2b`
and confirm the RSC payload carries a peaks array. Report the evidence.

```bash
git add src/lib/types.ts src/lib/data.ts
git commit -m "Carry a track's waveform to its page"
```

---

## Task 5: Share the waveform renderer

**Files:**
- Create: `src/player/waveform.ts`
- Modify: `src/components/PlayerBar.tsx`

- [ ] **Step 1: Move, do not copy**

Cut `renderWaveform` and `alpha` out of `PlayerBar.tsx` (they sit just above the
component, around lines 28–66) into `src/player/waveform.ts`, exported, with
their existing comments carried over. Add a header comment saying both the
player bar and the track page's visualizer draw through this, so the two
waveforms cannot drift.

Also export the bar constant so both callers agree:

```ts
/** Rounded-pill bar width, in px, shared by every waveform in the app. */
export const WAVE_STEP = 7;
```

and use it in place of the inline `const step = 7`.

- [ ] **Step 2: Import them back**

`PlayerBar.tsx` imports `renderWaveform` and `alpha` from `@/player/waveform`.
Nothing about its behaviour changes.

- [ ] **Step 3: Verify and commit**

Standing verification, plus: play a track and confirm the player bar's waveform
still draws (over HTTP you can at least confirm the page renders and the module
graph builds; say plainly if you cannot verify the canvas visually).

```bash
git add src/player/waveform.ts src/components/PlayerBar.tsx
git commit -m "Share one waveform renderer"
```

---

## Task 6: Pass stored peaks to the player bar

**Files:**
- Modify: `src/player/PlayerProvider.tsx` — `PlayerTrack`, `toPlayerTrack`
- Modify: `src/components/PlayerBar.tsx`

- [ ] **Step 1: Carry peaks on the queue entry**

Add to `PlayerTrack`:

```ts
  /** Stored waveform, when the caller has it (the track page). Lets the bar
      paint instantly instead of after decoding the file. */
  peaks: number[] | null;
```

and in `toPlayerTrack`, `peaks: track.peaks ?? null,`.

- [ ] **Step 2: Use them when creating the wavesurfer**

In `PlayerBar.tsx`'s `WS.create({...})`, add `peaks: current.peaks ? [current.peaks] : undefined,` and `duration: current.peaks ? duration : undefined,`.

**Read wavesurfer's docs or types before finalising this** — `peaks` expects an
array of channel arrays, and passing `peaks` without a matching `duration` is a
common footgun. If the installed version's API differs from this, report it
rather than guessing.

- [ ] **Step 3: Verify and commit**

```bash
git add src/player/PlayerProvider.tsx src/components/PlayerBar.tsx
git commit -m "Paint the player's wave from the stored peaks"
```

---

## Task 7: The song visualizer

**Files:**
- Create: `src/components/SongVisualizer.tsx`, `src/components/SongVisualizer.module.css`

**NEW component** — no existing treatment to copy, so this is the one place you
are designing. Keep it plain: a container tinted by the palette already in
scope, the shared `PlayButton`, the wave, the time.

- [ ] **Step 1: The two states**

The page's track is usually NOT the one playing, so the component has two modes
and remounts (via `key`) on the transition rather than mutating an instance:

- **Idle** (`current?.id !== track.track_id`): an own `<canvas>`, painted once
  with `renderWaveform([peaks], ctx)` from `@/player/waveform` in
  `alpha(palette.accent, 0.4)`. No wavesurfer, no audio element, no network.
  Clicking the wave or the play button plays the track.
- **Live**: a wavesurfer attached to `player.audioElement`, created exactly as
  `PlayerBar` does (read its effect — `media`, `renderFunction`, `interact`,
  `dragToSeek`, `cursorWidth: 0`, `waveColor`, `progressColor`) with `peaks` and
  `duration` passed so it never fetches or decodes. Seeking calls `player.seek`.

If `track.peaks` is null (a version the backfill could not decode), the idle
state renders an empty container at the same height — no canvas, no placeholder
bars. Do not fabricate a fake wave.

- [ ] **Step 2: Time display**

Show `formatTime(time) / formatTime(duration)` when live, and the track's total
duration alone when idle, using `formatTime` from `@/player/durations`.

- [ ] **Step 3: Styles**

Container: `border-radius: var(--radius-button)`, background
`color-mix(in srgb, var(--album-accent) 10%, transparent)`, padding `16px`,
a `display: flex` row with `gap: 16px` and `align-items: center` — the same
tinted-surface idiom `AlbumMetaTiles` uses for its tiles. Canvas height 32 to
match the player bar's wavesurfer `height: 32`.

- [ ] **Step 4: Verify and commit**

Standing verification, plus over HTTP confirm the visualizer markup renders on a
track page with peaks. Report evidence.

```bash
git add src/components/SongVisualizer.tsx src/components/SongVisualizer.module.css
git commit -m "Add the song visualizer"
```

---

## Task 8: Mark the viewed track in a tracklist

**Files:**
- Modify: `src/components/AlbumTrack.tsx`, `src/components/AlbumTrack.module.css`
- Modify: `src/components/AlbumPlaylist.tsx`

- [ ] **Step 1: A new prop, distinct from `active`**

`AlbumTrack`'s existing `active` means *this track is playing*. Add:

```ts
  /** This row is the track whose page we're on. Distinct from `active`, which
      means playing — both can be true at once. */
  current?: boolean;
```

Thread an optional `currentTrackId?: string` through `AlbumPlaylist` to set it.

- [ ] **Step 2: Style it**

**NEW**: on the row, `.current { background: color-mix(in srgb, var(--album-accent) 10%, transparent); border-radius: var(--radius-button); }`.
That tint is the app's existing "this surface is interactive/selected" idiom —
the same `color-mix` the play buttons and tiles use — so it reads as native.
Add `aria-current="true"` on the row when `current`.

Keep the playing treatment untouched; a row that is both playing and current
shows both.

- [ ] **Step 3: Verify and commit**

```bash
git add src/components/AlbumTrack.tsx src/components/AlbumTrack.module.css src/components/AlbumPlaylist.tsx
git commit -m "Let a tracklist mark the track being viewed"
```

---

## Task 9: Status labels

**Files:**
- Modify: `src/lib/i18n/messages/en.ts`, `src/lib/i18n/messages/fr.ts`

- [ ] **Step 1: Add the keys**

The catalog's statuses are exactly: `draft`, `demo`, `prototype`, `final`, and
null. In `en`:

```ts
  status: {
    draft: "Draft",
    demo: "Demo",
    prototype: "Prototype",
    final: "Final",
  },
```

In `fr` — adaptation, informal "Tu" register:

```ts
  status: {
    draft: "Brouillon",
    demo: "Démo",
    prototype: "Prototype",
    final: "Version finale",
  },
```

`Messages = typeof en`, so both files must gain the block or `tsc` fails.

- [ ] **Step 2: Verify and commit**

```bash
git add src/lib/i18n/messages
git commit -m "Name a recording's status in both languages"
```

---

## Task 10: The album aside

**Files:**
- Create: `src/components/AlbumAside.tsx`, `src/components/AlbumAside.module.css`
- Modify: `src/lib/data.ts` — `getTrack` returns the album's tracks

- [ ] **Step 1: Give `getTrack` the album's tracklist**

`TrackPage` currently carries `album: Album | null`. The aside needs the album's
tracks too. Reuse the existing read rather than writing a new one:
`getAlbumWithTracks(track.album_id)` already returns `AlbumWithTracks` with
tracks ordered by `album_tracks.position`. Change `TrackPage.album` to
`AlbumWithTracks | null` and call that instead of the bare `albums` select.

Check what that costs — it also loads genres and durations. If it turns out to
issue queries the page has no use for, say so and propose the narrower read
rather than accepting the waste silently.

- [ ] **Step 2: Write the aside**

Left-aligned. The album name as an `h2` linking to `/albums/[id]`, `AlbumInfos`
beneath it for the *N songs · M min* subtitle, then `AlbumPlaylist` with
`variant="simple"` and `currentTrackId` set to the viewed track. **No cover.**

Wrap it in `PaletteScope` for the album, as `AlbumSwitcher` does for its items.

Styles: follow `AlbumSwitcher.module.css`'s column idiom —
`display: flex; flex-direction: column; gap: 16px;`. Read it and match.

- [ ] **Step 3: Verify and commit**

```bash
git add src/components/AlbumAside.tsx src/components/AlbumAside.module.css src/lib/data.ts
git commit -m "Give the track page its album context"
```

---

## Task 11: Rebuild the hero to mirror the album hero

**Files:**
- Modify: `src/components/TrackHero.tsx`, `src/components/TrackHero.module.css`
- Create: `src/components/TrackActionTiles.tsx`, `src/components/TrackActionTiles.module.css`

- [ ] **Step 1: Mirror the album hero's structure**

Open `src/components/AlbumDetailCard.tsx` and copy its hero's shape — a `.hero`
flex row (`display: flex; gap: 24px; align-items: flex-start;`) holding the
cover, then a `.heroBody` column (`display: flex; flex-direction: column;
gap: 16px; flex: 1; min-width: 0;`). Those two rules are quoted from
`AlbumDetailCard.module.css`; copy them rather than approximating.

Contents, in order:
1. `AlbumCoverLive` for the **album's** cover at size 165 (what the album hero
   uses) — the vinyl slides out exactly as it does there.
2. The **track** name as `h1`.
3. Subtitle: release date · status. Format the date for the current locale
   (`Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" })`)
   and the status via `m.status[...]`. A null status shows the date alone; a null
   date shows the status alone; neither shows nothing.
4. The localized description.
5. `<TrackActionTiles>`.

**Delete the play button and the lyrics `IconButton` from the hero** — play now
lives in the visualizer, and lyrics moves into the tiles. The `LyricsSheet` and
its open state move to `TrackActionTiles`.

- [ ] **Step 2: The action tiles**

`TrackActionTiles` renders two tiles sharing `AlbumMetaTiles`' visual treatment
but interactive. Copy these rules from `AlbumMetaTiles.module.css` rather than
importing that module (it is presentational and stays so):

```css
.tiles {
  display: flex;
  gap: 16px;
  align-self: stretch;
}

.tile {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  flex-direction: row;
  gap: 16px;
  padding: 16px;
  border-radius: var(--radius-button);
  background: color-mix(in srgb, var(--album-accent) 10%, transparent);
}

@media (max-width: 767px) {
  .tile {
    flex-direction: column;
    justify-content: center;
    gap: 8px;
    padding: 16px 8px;
  }
}
```

Tile one holds `LikeButton` (unchanged — it is already shared) plus its count.
Tile two is a button opening the `LyricsSheet`, with a `Mic` icon and the
`m.player.lyrics` label. **The lyrics tile renders only when the track has
lyrics**, matching today's behaviour; when it is absent the like tile spans the
row on its own.

- [ ] **Step 3: Verify and commit**

Standing verification, plus over HTTP: confirm the hero renders the album cover,
track name, a subtitle containing the formatted date, and the tiles. Report
evidence.

```bash
git add src/components/TrackHero.tsx src/components/TrackHero.module.css src/components/TrackActionTiles.tsx src/components/TrackActionTiles.module.css
git commit -m "Build the track header like the album header"
```

---

## Task 12: Two-column page

**Files:**
- Modify: `src/app/tracks/[id]/page.tsx`, `src/app/tracks/[id]/page.module.css`

- [ ] **Step 1: The grid**

Copy the album page's content grid from `src/app/albums/[id]/page.module.css`:

```css
.content {
  display: grid;
  grid-template-columns: 400px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

@media (max-width: 767px) {
  .content {
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
  }
}
```

Add a modifier for the no-album case:

```css
.soloColumn {
  grid-template-columns: minmax(0, 1fr);
}
```

- [ ] **Step 2: Compose the page**

```
<Header variant="compact" />
<PaletteScope album={…}>
  <div className={content + (album ? "" : soloColumn)}>
    {album && <AlbumAside album={album} currentTrackId={track.track_id} />}
    <article className={styles.track}>
      <TrackHero track={track} lyrics={lyrics} />
      <SongVisualizer track={track} />
      {story && <Prose markdown={story} />}
    </article>
  </div>
</PaletteScope>
```

`.track` is the right column: `display: flex; flex-direction: column; gap: 40px;`
(the current `.content` rule — carry it over, do not re-derive it).

On mobile the aside stacks **above** the track column. If that reads wrong once
you see it, say so rather than silently reordering — it is a design call.

- [ ] **Step 3: Verify**

Standing verification, plus over HTTP on a track **with** an album and one
**without** (find one in the catalog; if every track has an album, say so and
verify the branch by reading the code rather than claiming you tested it).

- [ ] **Step 4: Commit**

```bash
git add "src/app/tracks"
git commit -m "Lay the track page out like the album page"
```

---

## Task 13: Docs

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the page description**

The `/tracks/[id]` bullet gains the new shape: album aside, header, visualizer,
notes. Add a Design-notes bullet for the stored waveform, pointing at the
migration and the backfill script, and saying why (the same reason durations are
stored).

- [ ] **Step 2: Full verification**

`npm run lint && npm run build`, then walk the surface in both languages: home,
album page, track page with and without lyrics, edit mode, the player.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Document the track page layout and the stored waveforms"
```

---

## Notes for whoever executes this

- **Task 1 blocks on Alexis** applying the migration; Tasks 2–4 and 6–7 need the
  column live. Tasks 5, 8, 9 do not — do those while waiting.
- **Task 3 runs a real data script against the live project.** Read it before
  running it, and report actual row counts.
- **The standing instruction about not inventing CSS is the whole point of this
  increment.** The previous one shipped an off-design play button that way.
