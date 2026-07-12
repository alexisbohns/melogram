# Track & Version Drawer — Design Spec

**Date:** 2026-07-12
**Status:** Implemented
**Author:** Alexis (with Claude)

## 1. Problem

The first-pass authoring UI (PR #100) left track/version management with a
rough UX and an off-system look:

- Creating a track was two-phase: stage a name in the setlist, Save (which
  exits edit mode), re-enter edit mode, expand the row, and only then upload
  audio — the UI even documented the workaround in a hint.
- Versions lived in a cramped one-at-a-time accordion (raw browser inputs);
  name and date were frozen after creation, release date was silently
  "today", there was no preview, and a fileless row (failed upload) was a
  dead end.
- Track description and lyrics were not editable at all (`update_track` and
  `delete_track` existed server-side but were unused).
- The edit UI used hardcoded blue (`#5b8cff`), grey rgba borders, 12–13px
  type, and `alert()`/`confirm()` — all foreign to the design language.

## 2. Design

### Track drawer (`TrackDrawer` + `VersionsSection`)

A sheet following the LyricsSheet house pattern (right 480px sheet on
desktop, 85% bottom sheet on mobile, `#1a1118`, one Gloock 24/29 title,
40×40 tonal close button, Escape/backdrop close) is the single home for a
track: details (name / description / lyrics), its versions, and deletion.

- **Entry points (edit mode):** pencil or track name in the setlist opens
  the drawer on that track; an "Add track" button opens it in create mode
  (replacing the staged add-by-name form).
- **Create morphs into edit:** the moment `create_track` returns, the drawer
  becomes the editor for the new track so recordings can be uploaded right
  away — no save-and-re-enter round trip, and a failed upload can never
  duplicate the track.
- **Versions:** rows show preview play/pause (through the global player,
  version id as queue id), name, status chip, date, and a "no audio" marker.
  Each row expands to edit name/status/date, attach or replace audio, and
  remove with an inline two-step confirm. Adding a version requires a file
  (fileless dead-ends stay impossible); the name prefills from the filename.
- **Danger zone:** "Delete track" wires the existing `delete_track` RPC,
  with copy stating it is immediate and not undone by Cancel; audio objects
  are best-effort removed from Storage (paths snapshotted before the RPC).
- **Safety:** dirty forms guard Escape/backdrop close behind a "Discard
  changes?" confirm; armed destructive buttons auto-disarm; every mutation
  has its own busy state and inline error (no `alert()`).

### Persistence semantics, made coherent

- **Drawer = immediate commits** with explicit per-section buttons.
- **Setlist = staged** (reorder + remove-from-album) behind album
  Save/Cancel, as before. The provider now merges fresh server data into the
  staged setlist after every refresh (keeping staged order and removals,
  splicing in drawer-created tracks, dropping drawer-deleted ones) instead
  of blindly resetting it.

### Cache correctness (production)

- The album page is ISR (`revalidate = 300`) over cookie-free anon fetches,
  so `router.refresh()` alone serves the stale route cache for up to 5
  minutes in production. A minimal server action (`revalidateContent`)
  purges the route cache before every refresh — the first `"use server"`
  file in the codebase.
- Version audio and covers upload to fixed paths with `upsert`, which does
  not purge the storage CDN; stored `resource_url`/`cover_url` are now
  cache-busted (`?v=<epoch>`). Storage-object paths are parsed from URLs
  with the query stripped.

### Design-consistency sweep

`src/components/edit/controls.module.css` is the shared vocabulary: 16px
controls with `--album-light` 14% borders and accent focus; tonal text
buttons (accent 20% → 35% hover, light text), solid-accent primaries; 40×40
tonal/ghost icon buttons; 11px tracked uppercase eyebrow labels and status
chips; a new `--danger` token (`#e5747e`) for destructive tints. All blue
hexes, grey rgba borders, off-scale radii and font sizes were removed from
the edit components (EditToggle, GenrePicker, AlbumTypeSelect, EditableText,
EditableSetlist); `VersionsPanel` is deleted.

## 3. Migration

`20260712001100_rpc_version_upload_path.sql` adds
`version_upload_path(_version_id)` — the deterministic storage path for an
existing version (member-guarded, junction fallback for legacy rows with
NULL `versions.track_id`). It powers "Add audio" on fileless versions;
replacing an existing file reuses the path parsed from the current URL.
**Apply this migration before the attach-audio affordance will work.**

## 4. Deferred

- Read-mode (listener-facing) version history.
- Upload progress percentage (supabase-js upload has no progress callback).
- Per-track cover editing; works/variants; album creation from zero.
