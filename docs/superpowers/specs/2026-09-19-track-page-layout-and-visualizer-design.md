# Track Page Layout & Song Visualizer — Design Spec

**Date:** 2026-09-19
**Status:** Approved design → ready for implementation planning
**Author:** Alexis (with Claude)
**Follows:** [`2026-09-19-bilingual-prose-and-track-page-design.md`](2026-09-19-bilingual-prose-and-track-page-design.md)

## 1. Problem

The track page shipped in the previous increment works, but it does not look like
the rest of the app. Its hero was invented rather than derived: a one-off play
button (since fixed), a layout that shares nothing with the album page, and no
sense of the album the track belongs to. It reads as a different product.

Separately, the page has no way to *see* a song. The floating player has a
waveform; the page devoted to a single track does not.

## 2. Goals & scope

**In scope:**

- A **two-column track page** mirroring `/albums/[id]`: a left column of album
  context, a right column of track content.
- A **track hero** built like the album hero — vinyl, name, subtitle,
  description, tiles — where the tiles carry the like and lyrics *actions*.
- A **song visualizer**: the song's color, a play button, a waveform, a duration.
- **Precomputed waveform peaks**, stored per version, so no page view downloads
  or decodes audio to draw a wave.

**Out of scope:**

- Changing the album page. It is the reference, not the subject.
- Folding `PlayerBar`'s transport buttons into the shared `PlayButton`. Its
  buttons have their own sizes and states; that is its own decision.
- Any change to what plays, or to the single-audio-element architecture.

## 3. Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Waveform data | **Precomputed peaks on `versions`** | `duration_seconds` exists for exactly this reason — see `20260712001200_version_duration.sql`: browser-side audio sniffing caused "infinite spinners, device heat, stolen audio sessions, and WebContent OOM crashes on iOS". Decoding audio per page view would walk back into it |
| Peak resolution | **512 values, `real[]`, normalized 0–1** | Enough for any width the app renders; a few KB per version |
| Where peaks are read | **`getTrack` only** | `attachDurations` runs for every track on home and album pages; 512 floats × 28 tracks would bloat those payloads for nothing |
| Who computes them | **On upload (browser `AudioContext`) + a backfill script (`ffmpeg`)** | Mirrors the duration pattern exactly. Peaks genuinely require decoding, so the backfill needs a decoder; `ffmpeg` is available |
| Visualizer, idle | **Own `<canvas>`, painted from stored peaks** | No wavesurfer, no audio, no network. Click plays |
| Visualizer, live | **Wavesurfer on the shared `<audio>`, peaks passed in** | Same render-only pattern as `PlayerBar`; passing peaks means it never fetches or decodes |
| Play button on the page | **Only in the visualizer** | The hero's tiles carry like and lyrics; one transport unit per page |
| Left column tracklist | **Navigates** to each track's page | The album page's left column is navigation; this matches it |
| Track with no album | **Single column, no aside** | `album_id` is nullable |

## 4. Waveform peaks

```sql
alter table public.versions add column waveform_peaks real[];
```

`set_version_file` gains `_peaks real[] default null`, with the 3-argument
signature dropped first — the same overload hazard that migration documents for
itself, for the same reason.

- **Upload** (`uploadToPath` in `src/lib/edit.ts`): decode the `File` with
  `AudioContext.decodeAudioData`, downsample channel 0 to 512 absolute-value
  buckets normalized to 0–1, pass as `_peaks`. Failure degrades to `null` — a
  version without peaks still uploads, it just has no idle wave.
- **Backfill** (`scripts/backfill-version-waveforms.mjs`): mirrors
  `backfill-version-durations.mjs` — same env resolution, same re-runnable
  "only rows where `waveform_peaks is null`" contract. Decodes via `ffmpeg` to
  raw PCM and downsamples.
- **Read**: `getTrack` selects `waveform_peaks` alongside the duration it
  already reads, and attaches it to the returned track. Nothing else reads it.

## 5. Layout

`grid-template-columns: 400px minmax(0, 1fr)`, matching `src/app/albums/[id]/page.module.css`.

### Left column — `AlbumAside`

The album's name (left-aligned, linking to `/albums/[id]`), an `AlbumInfos`
subtitle (*N songs · M min*), and the album's tracklist with the viewed track
marked. **No cover** — the hero has the vinyl.

Marking the viewed track needs a **new prop** on `AlbumTrack`: its existing
`active` means *playing*, and "the track you are looking at" is a different
state. Both can be true at once, so they get distinct styling.

### Right column

1. **`TrackHero`**, rebuilt to mirror `AlbumDetailCard`'s hero:
   - the album's vinyl (`AlbumCoverLive`)
   - the track name (`h1`)
   - subtitle: release date · status
   - the localized description
   - tiles carrying **like** and **lyrics** as actions
2. **`SongVisualizer`**
3. **`Prose`** (unchanged)

Status labels (`draft`, `demo`, `prototype`, `final`) get message keys in both
dictionaries. A null status shows the date alone.

`AlbumMetaTiles` is presentational and stays that way; the action tiles are a
sibling component sharing its visual treatment. The heart remains `LikeButton`,
placed inside a tile.

## 6. `SongVisualizer`

A container tinted by the song's palette, holding the play button (the shared
`PlayButton`), the waveform, and the duration.

Two states, because the page's track is usually not the one playing:

- **Idle** — an own `<canvas>` painted from the stored peaks with the shared
  `renderWaveform` function. No wavesurfer instance, no audio element, no
  network. Clicking it plays the track.
- **Live** (this track is `current`) — a wavesurfer attached to the player's
  shared `<audio>` element exactly as `PlayerBar` does, with `peaks` and
  `duration` passed so it never fetches or decodes. Seekable.

The instance is remounted on the idle↔live transition rather than mutated.

`renderWaveform` and the `alpha` helper move out of `PlayerBar.tsx` into a
shared module used by both. Copying them would repeat the mistake that produced
four divergent play buttons.

`PlayerBar` also gains the stored peaks, so its wave paints immediately instead
of after decoding.

## 7. Risks

- **Peak payload.** 512 floats is small for one track and large for twenty-eight.
  The read path is deliberately narrow (§3); widening it later is how this
  regresses.
- **Two waveform code paths.** Idle canvas and live wavesurfer must look
  identical, which is why both go through one `renderWaveform`.
- **The backfill needs `ffmpeg`.** Unlike the durations script, there is no
  dependency-free shortcut — peaks require real decoding.
