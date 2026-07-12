# Inline Edit UI — Implementation Plan (Plan 2 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a member-gated, WYSIWYG inline edit mode to the album page so an artist can edit an album (name / description / type / genres / cover), manage its setlist (add / remove / move tracks), and manage each track's versions (upload audio) — all against the verified RPCs from Plan 1.

**Architecture:** A `"use client"` `AlbumEditProvider` (mirroring the existing `LikesProvider` pattern — memoized browser Supabase client, optimistic updates, rollback) determines `canEdit` client-side by reading the current user's `artist_members` rows, and holds **staged** album/setlist edits committed on an explicit **Save** (Cancel discards). File uploads (cover, audio) are **immediate** discrete actions, since a binary can't stage and `create_version` must create the row before an upload path exists. All mutations go through a thin typed client-side "edit API" (`src/lib/edit.ts`) that wraps the Plan 1 RPCs + Storage. The listener render path is untouched when not editing.

**Tech Stack:** Next.js 16 App Router, React 19, `@supabase/ssr` browser client, `lucide-react` icons, CSS Modules. **No new dependencies** (reorder uses up/down controls).

**Spec:** `docs/superpowers/specs/2026-07-12-artist-content-management-design.md` (§8)
**Depends on:** Plan 1 (`docs/superpowers/plans/2026-07-12-artist-content-api-foundation.md`) — applied & verified.

---

## Conventions for every task

**No automated tests** (established: no test framework, manual verification via the app). Each task ends with a **manual verification** run against `npm run dev`, signed in as your owner account (the Bohns owner seeded in Plan 1). A second, signed-out browser confirms listeners never see edit affordances.

**Bucket ids (from Plan 1):** audio → `versions`, covers → `covers`. **Album has no `slug` column**, so cover objects are keyed by album id.

**Commit** one focused commit per task.

**File map (created/modified across the plan):**
- `src/lib/types.ts` — *modify*: add `artist_id` to `Album`; add `Genre`, `AlbumVersion`.
- `src/lib/data.ts` — *modify*: album detail fetch gains `artist_id`, genres, position-ordered tracks; add `getGenres`.
- `src/lib/edit.ts` — *create*: typed client wrappers over the Plan 1 RPCs + Storage.
- `src/components/edit/AlbumEditProvider.tsx` — *create*: edit state + save/cancel + canEdit.
- `src/components/edit/EditToggle.tsx` — *create*: Edit / Save+Cancel controls.
- `src/components/edit/EditableText.tsx` — *create*: contenteditable field.
- `src/components/edit/AlbumTypeSelect.tsx`, `GenrePicker.tsx`, `CoverUploader.tsx` — *create*.
- `src/components/edit/EditableSetlist.tsx`, `VersionsPanel.tsx` — *create*.
- `src/components/AlbumDetailCard.tsx` — *modify*: consume edit context, render editable variants when `editing`.
- `src/app/albums/[id]/page.tsx` — *modify*: fetch richer album, wrap card in provider.

---

## Task 1: Data layer — artist_id, genres, position order, genre list

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/data.ts`

- [ ] **Step 1: Extend the types**

In `src/lib/types.ts`, add `artist_id` to `Album` and add two new types:

```ts
export type Album = {
  id: string;
  artist_id: string | null;
  name: string;
  description: string | null;
  type: string | null;
  cover_url: string | null;
  created_at: string;
};

export type Genre = { id: string; name: string; slug: string };

/** A full row of public.versions (edit view — the read view uses Track). */
export type AlbumVersion = {
  id: string;
  name: string;
  status: string;
  release_date: string;
  resource_url: string | null;
};
```

`AlbumWithTracks` gains genres:

```ts
export type AlbumWithTracks = Album & {
  tracks: Track[];
  genres: Genre[];
};
```

- [ ] **Step 2: Fetch artist_id, genres, and position-ordered tracks**

In `src/lib/data.ts`, add `artist_id` to the album columns and enrich the single-album fetch. Replace the `ALBUM_COLS` constant and `getAlbumWithTracks`, and add `getGenres`:

```ts
const ALBUM_COLS = "id,artist_id,name,description,type,cover_url,created_at";

export async function getAlbumWithTracks(
  id: string
): Promise<AlbumWithTracks | null> {
  const [albumRes, tracksRes, orderRes, genresRes] = await Promise.all([
    supabase.from("albums").select(ALBUM_COLS).eq("id", id).maybeSingle(),
    supabase.from("track_overview").select(TRACK_COLS).eq("album_id", id),
    supabase.from("album_tracks").select("track_id,position").eq("album_id", id),
    supabase
      .from("album_genres")
      .select("genres(id,name,slug)")
      .eq("album_id", id),
  ]);

  if (albumRes.error || !albumRes.data) return null;
  if (tracksRes.error) fail("Failed to load album tracks", tracksRes.error);

  const position = new Map(
    (orderRes.data ?? []).map((r) => [r.track_id as string, r.position as number])
  );
  const tracks = ((tracksRes.data ?? []) as Track[]).slice().sort(
    (a, b) =>
      (position.get(a.track_id) ?? Number.MAX_SAFE_INTEGER) -
      (position.get(b.track_id) ?? Number.MAX_SAFE_INTEGER)
  );

  const genres = (genresRes.data ?? [])
    .map((row) => (row as { genres: Genre | null }).genres)
    .filter((g): g is Genre => Boolean(g));

  return { ...(albumRes.data as Album), tracks, genres };
}

/** All genres, alphabetical — powers the edit combobox. */
export async function getGenres(): Promise<Genre[]> {
  const { data, error } = await supabase
    .from("genres")
    .select("id,name,slug")
    .order("name");
  if (error) fail("Failed to load genres", error);
  return (data ?? []) as Genre[];
}
```

Add `Genre` to the type import at the top of `data.ts`:

```ts
import type { Album, AlbumWithTracks, Genre, Track, TrackLyrics } from "./types";
```

> Note: `getAlbumsWithTracks` (the plural, used by `AlbumSwitcher`) is unchanged; it returns `genres: []`-free `AlbumWithTracks` via `groupTracks`. Update `groupTracks` to include `genres: []` so the type is satisfied:

```ts
return albums.map((album) => ({
  ...album,
  tracks: byAlbum.get(album.id) ?? [],
  genres: [],
}));
```

- [ ] **Step 3: Point the album page at the enriched fetch**

In `src/app/albums/[id]/page.tsx`, keep `getAlbumsWithTracks()` for the switcher, but fetch the detailed album via `getAlbumWithTracks(id)` and pass THAT to the card:

```tsx
import { getAlbumsWithTracks, getAlbumWithTracks, getLyrics } from "@/lib/data";
// ...
export default async function AlbumPage({ params }: Props) {
  const { id } = await params;

  const [albums, album] = await Promise.all([
    getAlbumsWithTracks(),
    getAlbumWithTracks(id),
  ]);
  if (!album) notFound();

  const lyrics = await getLyrics(album.tracks.map((t) => t.track_id));

  return (
    <div className={styles.page}>
      <Header variant="compact" />
      <div className={styles.content}>
        <AlbumSwitcher albums={albums} activeId={album.id} />
        <AlbumDetailCard album={album} lyrics={lyrics} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Manual verification**

Run `npm run dev`, open an album page. Confirm: (a) it still renders; (b) tracks now appear in **setlist/position order** (matching `album_tracks.position`, not release date); (c) no console errors. In the browser devtools Network tab you can confirm the `album_genres` request returns the album's genres.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/data.ts src/app/albums/\[id\]/page.tsx
git commit -m "feat(ui): album detail fetch gains artist_id, genres, setlist order"
```

---

## Task 2: The edit API wrapper (`src/lib/edit.ts`)

A single typed module wrapping every Plan 1 RPC + Storage call the UI needs. DRY: every component calls these, not `supabase.rpc` directly.

**Files:**
- Create: `src/lib/edit.ts`

- [ ] **Step 1: Write the module**

```ts
import { createClient } from "@/lib/supabase/client";
import type { AlbumVersion, Genre } from "@/lib/types";

/** Artist ids the signed-in user may edit (own artist_members rows, RLS-scoped). */
export async function getMyArtistIds(): Promise<Set<string>> {
  const supabase = createClient();
  const { data, error } = await supabase.from("artist_members").select("artist_id");
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r) => r.artist_id as string));
}

export async function updateAlbum(
  albumId: string,
  name: string,
  description: string | null,
  type: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("update_album", {
    _album_id: albumId,
    _name: name,
    _description: description,
    _type: type,
  });
  if (error) throw new Error(error.message);
}

export async function setAlbumGenres(albumId: string, genreIds: string[]): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("set_album_genres", {
    _album_id: albumId,
    _genre_ids: genreIds,
  });
  if (error) throw new Error(error.message);
}

export async function createGenre(name: string): Promise<Genre> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_genre", { _name: name });
  if (error) throw new Error(error.message);
  return data as Genre;
}

export async function createTrack(albumId: string, name: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_track", {
    _album_id: albumId,
    _name: name,
    _description: null,
    _lyrics: null,
  });
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

export async function removeTrackFromAlbum(albumId: string, trackId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("remove_track_from_album", {
    _album_id: albumId,
    _track_id: trackId,
  });
  if (error) throw new Error(error.message);
}

export async function reorderSetlist(albumId: string, orderedTrackIds: string[]): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("reorder_setlist", {
    _album_id: albumId,
    _ordered_track_ids: orderedTrackIds,
  });
  if (error) throw new Error(error.message);
}

/** Upload a cover to the `covers` bucket and record its public URL. */
export async function uploadAlbumCover(albumId: string, file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${albumId}/cover.${ext}`;
  const up = await supabase.storage.from("covers").upload(path, file, { upsert: true });
  if (up.error) throw new Error(up.error.message);
  const url = supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.rpc("set_album_cover", {
    _album_id: albumId,
    _cover_url: url,
  });
  if (error) throw new Error(error.message);
  return url;
}

/** All versions of a track, newest release first (edit view). */
export async function listTrackVersions(trackId: string): Promise<AlbumVersion[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("track_versions")
    .select("versions(id,name,status,release_date,resource_url)")
    .eq("track_id", trackId);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((row) => (row as { versions: AlbumVersion | null }).versions)
    .filter((v): v is AlbumVersion => Boolean(v))
    .sort((a, b) => b.release_date.localeCompare(a.release_date));
}

export async function updateVersion(
  versionId: string,
  name: string,
  status: string,
  releaseDate: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("update_version", {
    _version_id: versionId,
    _name: name,
    _status: status,
    _release_date: releaseDate,
  });
  if (error) throw new Error(error.message);
}

export async function deleteVersion(versionId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("delete_version", { _version_id: versionId });
  if (error) throw new Error(error.message);
}

/** Create a version row, upload its audio, and record the URL. Returns the id. */
export async function createVersionWithFile(
  trackId: string,
  name: string,
  status: string,
  releaseDate: string,
  file: File
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_version", {
    _track_id: trackId,
    _name: name,
    _status: status,
    _release_date: releaseDate,
  });
  if (error) throw new Error(error.message);
  // create_version RETURNS TABLE(...) → PostgREST returns an array of rows.
  const row = (data as { version_id: string; upload_path: string }[])[0];
  if (!row) throw new Error("create_version returned no row");
  const { version_id, upload_path } = row;

  const up = await supabase.storage.from("versions").upload(upload_path, file, { upsert: true });
  if (up.error) throw new Error(up.error.message);
  const url = supabase.storage.from("versions").getPublicUrl(upload_path).data.publicUrl;

  const setErr = (
    await supabase.rpc("set_version_file", { _version_id: version_id, _resource_url: url })
  ).error;
  if (setErr) throw new Error(setErr.message);
  return version_id;
}

export const VERSION_STATUSES = ["raw", "draft", "demo", "prototype", "final"] as const;
export const ALBUM_TYPES = ["single", "ep", "album"] as const;
```

- [ ] **Step 2: Manual verification** — none yet (no callers). Confirm it type-checks: `npx tsc --noEmit` should report no errors in `src/lib/edit.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/edit.ts
git commit -m "feat(ui): typed client edit API over Plan 1 RPCs + storage"
```

---

## Task 3: Edit provider + Edit toggle (canEdit, editing state)

**Files:**
- Create: `src/components/edit/AlbumEditProvider.tsx`
- Create: `src/components/edit/EditToggle.tsx`
- Create: `src/components/edit/EditToggle.module.css`
- Modify: `src/app/albums/[id]/page.tsx` (wrap card)
- Modify: `src/components/AlbumDetailCard.tsx` (render the toggle)

- [ ] **Step 1: Write the provider**

`src/components/edit/AlbumEditProvider.tsx` — holds `canEdit`, `editing`, and staged album-field state. (Setlist + versions state is added in later tasks; this task establishes the provider + save/cancel scaffold for album fields only.)

```tsx
"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";
import type { AlbumWithTracks } from "@/lib/types";
import { getMyArtistIds, updateAlbum } from "@/lib/edit";

type Draft = { name: string; description: string; type: string };

type EditContextValue = {
  canEdit: boolean;
  editing: boolean;
  saving: boolean;
  dirty: boolean;
  draft: Draft;
  startEditing: () => void;
  cancel: () => void;
  save: () => Promise<void>;
  setField: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  album: AlbumWithTracks;
};

const EditContext = createContext<EditContextValue | null>(null);

export function useAlbumEdit(): EditContextValue {
  const ctx = useContext(EditContext);
  if (!ctx) throw new Error("useAlbumEdit must be used within <AlbumEditProvider>");
  return ctx;
}

function draftFrom(album: AlbumWithTracks): Draft {
  return {
    name: album.name,
    description: album.description ?? "",
    type: album.type ?? "album",
  };
}

export function AlbumEditProvider({
  album,
  children,
}: {
  album: AlbumWithTracks;
  children: React.ReactNode;
}) {
  const [canEdit, setCanEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(album));

  useEffect(() => {
    let active = true;
    getMyArtistIds()
      .then((ids) => {
        if (active) setCanEdit(album.artist_id ? ids.has(album.artist_id) : false);
      })
      .catch(() => {
        if (active) setCanEdit(false);
      });
    return () => {
      active = false;
    };
  }, [album.artist_id]);

  const dirty = useMemo(
    () =>
      draft.name !== album.name ||
      draft.description !== (album.description ?? "") ||
      draft.type !== (album.type ?? "album"),
    [draft, album]
  );

  const startEditing = useCallback(() => setEditing(true), []);

  const cancel = useCallback(() => {
    setDraft(draftFrom(album));
    setEditing(false);
  }, [album]);

  const setField = useCallback(
    <K extends keyof Draft>(key: K, value: Draft[K]) =>
      setDraft((d) => ({ ...d, [key]: value })),
    []
  );

  const save = useCallback(async () => {
    setSaving(true);
    try {
      if (dirty) {
        await updateAlbum(album.id, draft.name, draft.description || null, draft.type);
      }
      setEditing(false);
      // Reflect the saved values without a full reload.
      album.name = draft.name;
      album.description = draft.description || null;
      album.type = draft.type;
    } catch (err) {
      console.error("Save failed", err);
      alert("Save failed: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [album, draft, dirty]);

  const value = useMemo<EditContextValue>(
    () => ({
      canEdit, editing, saving, dirty, draft,
      startEditing, cancel, save, setField, album,
    }),
    [canEdit, editing, saving, dirty, draft, startEditing, cancel, save, setField, album]
  );

  return <EditContext.Provider value={value}>{children}</EditContext.Provider>;
}
```

> Note: mutating `album.name` after save is a pragmatic local reflect (the object is client-owned on this page). A later task can switch to `router.refresh()` if you prefer server round-trips; for now it avoids a flash.

- [ ] **Step 2: Write the toggle**

`src/components/edit/EditToggle.tsx`:

```tsx
"use client";

import { Pencil, Check, X } from "lucide-react";
import { useAlbumEdit } from "./AlbumEditProvider";
import styles from "./EditToggle.module.css";

export default function EditToggle() {
  const { canEdit, editing, saving, startEditing, cancel, save } = useAlbumEdit();
  if (!canEdit) return null;

  if (!editing) {
    return (
      <button type="button" className={styles.edit} onClick={startEditing} aria-label="Edit album">
        <Pencil size={16} strokeWidth={2} />
        <span>Edit</span>
      </button>
    );
  }

  return (
    <div className={styles.actions}>
      <button type="button" className={styles.cancel} onClick={cancel} disabled={saving}>
        <X size={16} strokeWidth={2} />
        <span>Cancel</span>
      </button>
      <button type="button" className={styles.save} onClick={save} disabled={saving}>
        <Check size={16} strokeWidth={2} />
        <span>{saving ? "Saving…" : "Save"}</span>
      </button>
    </div>
  );
}
```

`src/components/edit/EditToggle.module.css`:

```css
.edit, .save, .cancel {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 999px; font: inherit; font-size: 13px;
  cursor: pointer; border: 1px solid rgba(128, 128, 128, 0.35);
  background: rgba(128, 128, 128, 0.08); color: inherit;
}
.actions { display: inline-flex; gap: 8px; }
.save { background: #5b8cff; border-color: #5b8cff; color: #fff; }
.save:disabled, .cancel:disabled { opacity: 0.6; cursor: default; }
```

- [ ] **Step 3: Editable field components**

`src/components/edit/EditableText.tsx` — a `contenteditable` element that commits to the draft on blur:

```tsx
"use client";

import { useRef } from "react";

type Props = {
  value: string;
  onCommit: (value: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
  ariaLabel: string;
};

export default function EditableText({
  value, onCommit, className, placeholder, multiline = false, ariaLabel,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      role="textbox"
      aria-label={ariaLabel}
      contentEditable
      suppressContentEditableWarning
      className={className}
      data-placeholder={placeholder}
      style={{ outline: "1px dashed rgba(91,140,255,0.6)", borderRadius: 6, padding: "2px 6px", minHeight: "1em" }}
      onKeyDown={(e) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          ref.current?.blur();
        }
      }}
      onBlur={(e) => onCommit(e.currentTarget.textContent ?? "")}
    >
      {value}
    </div>
  );
}
```

`src/components/edit/AlbumTypeSelect.tsx`:

```tsx
"use client";

import { ALBUM_TYPES } from "@/lib/edit";

export default function AlbumTypeSelect({
  value, onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label="Album type"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ font: "inherit", padding: "4px 8px", borderRadius: 6 }}
    >
      {ALBUM_TYPES.map((t) => (
        <option key={t} value={t}>
          {t.charAt(0).toUpperCase() + t.slice(1)}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 4: Make `AlbumDetailCard` edit-aware**

Replace `src/components/AlbumDetailCard.tsx` entirely (it becomes a client component that reads the edit context; read mode renders exactly as before):

```tsx
"use client";

import type { AlbumWithTracks, TrackLyrics } from "@/lib/types";
import { getPalette, paletteVars } from "@/lib/palettes";
import AlbumCover from "./AlbumCover";
import AlbumHeader from "./AlbumHeader";
import AlbumInfos from "./AlbumInfos";
import AlbumMetaTiles from "./AlbumMetaTiles";
import AlbumPlaylist from "./AlbumPlaylist";
import EditToggle from "./edit/EditToggle";
import EditableText from "./edit/EditableText";
import AlbumTypeSelect from "./edit/AlbumTypeSelect";
import { useAlbumEdit } from "./edit/AlbumEditProvider";
import styles from "./AlbumDetailCard.module.css";

type Props = { album: AlbumWithTracks; lyrics: TrackLyrics };

export default function AlbumDetailCard({ album, lyrics }: Props) {
  const { editing, draft, setField } = useAlbumEdit();
  const palette = getPalette(album);

  return (
    <article className={styles.card} style={paletteVars(palette)}>
      <div className={styles.editBar}>
        <EditToggle />
      </div>
      <div className={styles.hero}>
        <AlbumCover coverUrl={album.cover_url} alt={album.name} size={165} priority />
        <div className={styles.heroBody}>
          {editing ? (
            <div className={styles.header}>
              <EditableText
                ariaLabel="Album name"
                value={draft.name}
                onCommit={(v) => setField("name", v)}
                className={styles.nameEdit}
              />
              <AlbumInfos tracks={album.tracks} />
            </div>
          ) : (
            <AlbumHeader album={album} />
          )}

          {editing ? (
            <EditableText
              ariaLabel="Album description"
              multiline
              value={draft.description}
              placeholder="Add a description…"
              onCommit={(v) => setField("description", v)}
              className={styles.description}
            />
          ) : (
            album.description && <p className={styles.description}>{album.description}</p>
          )}

          {editing ? (
            <AlbumTypeSelect value={draft.type} onChange={(v) => setField("type", v)} />
          ) : (
            <AlbumMetaTiles
              genre={palette.genre ?? capitalize(album.type)}
              year={new Date(album.created_at).getFullYear().toString()}
              direction="horizontal"
            />
          )}
        </div>
      </div>
      <AlbumPlaylist tracks={album.tracks} variant="detailed" lyrics={lyrics} />
    </article>
  );
}

function capitalize(value: string | null): string {
  if (!value) return "Album";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
```

Add two style rules to `src/components/AlbumDetailCard.module.css` (append at the end):

```css
.editBar { display: flex; justify-content: flex-end; margin-bottom: 8px; }
.nameEdit { font-size: 1.5rem; font-weight: 700; }
```

- [ ] **Step 5: Wrap the page in the provider**

In `src/app/albums/[id]/page.tsx`, wrap the card:

```tsx
import { AlbumEditProvider } from "@/components/edit/AlbumEditProvider";
// ...
        <AlbumSwitcher albums={albums} activeId={album.id} />
        <AlbumEditProvider album={album}>
          <AlbumDetailCard album={album} lyrics={lyrics} />
        </AlbumEditProvider>
```

- [ ] **Step 6: Manual verification**

`npm run dev`. Signed in as the Bohns owner, open an album: an **Edit** button appears. Click it → name/description become editable, type becomes a select, and Save/Cancel appear. Change the name, click **Save**, reload → the change persisted. Repeat, change something, click **Cancel** → reverts. In a **signed-out** (or non-member) browser, **no Edit button** appears. Non-member safety is also enforced server-side by the RPCs (Plan 1).

- [ ] **Step 7: Commit**

```bash
git add src/components/edit/AlbumEditProvider.tsx src/components/edit/EditToggle.tsx src/components/edit/EditToggle.module.css src/components/edit/EditableText.tsx src/components/edit/AlbumTypeSelect.tsx src/components/AlbumDetailCard.tsx src/components/AlbumDetailCard.module.css src/app/albums/\[id\]/page.tsx
git commit -m "feat(ui): inline album edit mode — name/description/type with Save/Cancel"
```

---

## Task 4: Genre picker (chips + searchable combobox + create)

Extends the provider with staged `genreIds` and adds a custom combobox (no library).

**Files:**
- Modify: `src/components/edit/AlbumEditProvider.tsx` (stage genres, save them)
- Create: `src/components/edit/GenrePicker.tsx`
- Create: `src/components/edit/GenrePicker.module.css`
- Modify: `src/components/AlbumDetailCard.tsx` (render `GenrePicker` in edit mode)

- [ ] **Step 1: Add genres to the provider draft**

In `AlbumEditProvider.tsx`, extend `Draft`, `draftFrom`, `dirty`, and `save`:

```tsx
type Draft = { name: string; description: string; type: string; genreIds: string[] };

function draftFrom(album: AlbumWithTracks): Draft {
  return {
    name: album.name,
    description: album.description ?? "",
    type: album.type ?? "album",
    genreIds: album.genres.map((g) => g.id),
  };
}
```

Add genres to `dirty` (compare as sorted joins):

```tsx
const dirty = useMemo(() => {
  const a = draft.genreIds.slice().sort().join(",");
  const b = album.genres.map((g) => g.id).slice().sort().join(",");
  return (
    draft.name !== album.name ||
    draft.description !== (album.description ?? "") ||
    draft.type !== (album.type ?? "album") ||
    a !== b
  );
}, [draft, album]);
```

In `save`, after `updateAlbum`, persist genres and reflect them locally. Import `setAlbumGenres` and, for local reflect, you need the full `Genre` objects — accept them from the picker via a ref of known genres. Simplest: store the chosen `Genre[]` in the draft too. Replace `genreIds: string[]` handling by keeping `genres: Genre[]` in the draft instead:

```tsx
// Draft holds full Genre objects so we can reflect + compute chips without a refetch.
type Draft = { name: string; description: string; type: string; genres: Genre[] };

function draftFrom(album: AlbumWithTracks): Draft {
  return {
    name: album.name,
    description: album.description ?? "",
    type: album.type ?? "album",
    genres: album.genres,
  };
}
```

Update `dirty` to compare `draft.genres.map(g=>g.id)`; update `save`:

```tsx
if (dirty) {
  await updateAlbum(album.id, draft.name, draft.description || null, draft.type);
  await setAlbumGenres(album.id, draft.genres.map((g) => g.id));
}
setEditing(false);
album.name = draft.name;
album.description = draft.description || null;
album.type = draft.type;
album.genres = draft.genres;
```

Add `Genre` to the type import and `setAlbumGenres` to the edit import. Expose `setField` (already generic over `keyof Draft`, so `setField("genres", nextGenres)` works).

- [ ] **Step 2: Write the combobox**

`src/components/edit/GenrePicker.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Plus } from "lucide-react";
import type { Genre } from "@/lib/types";
import { getGenres } from "@/lib/data";
import { createGenre } from "@/lib/edit";
import styles from "./GenrePicker.module.css";

export default function GenrePicker({
  selected, onChange,
}: {
  selected: Genre[];
  onChange: (genres: Genre[]) => void;
}) {
  const [all, setAll] = useState<Genre[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getGenres().then(setAll).catch((e) => console.error("load genres", e));
  }, []);

  const selectedIds = useMemo(() => new Set(selected.map((g) => g.id)), [selected]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((g) => !selectedIds.has(g.id) && (!q || g.name.toLowerCase().includes(q)));
  }, [all, query, selectedIds]);

  const exact = all.some((g) => g.name.toLowerCase() === query.trim().toLowerCase());

  function add(g: Genre) {
    onChange([...selected, g]);
    setQuery("");
    setOpen(false);
  }
  function remove(id: string) {
    onChange(selected.filter((g) => g.id !== id));
  }
  async function createAndAdd() {
    const name = query.trim();
    if (!name) return;
    try {
      const g = await createGenre(name);
      setAll((prev) => (prev.some((x) => x.id === g.id) ? prev : [...prev, g]));
      add(g);
    } catch (e) {
      console.error("create genre", e);
      alert("Could not create genre: " + (e as Error).message);
    }
  }

  return (
    <div className={styles.picker}>
      <div className={styles.chips}>
        {selected.map((g) => (
          <span key={g.id} className={styles.chip}>
            {g.name}
            <button type="button" aria-label={`Remove ${g.name}`} onClick={() => remove(g.id)}>
              <X size={12} strokeWidth={2.5} />
            </button>
          </span>
        ))}
      </div>
      <div className={styles.inputWrap}>
        <input
          className={styles.input}
          value={query}
          placeholder="Add genre…"
          aria-label="Search or add genre"
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {open && (matches.length > 0 || (query.trim() && !exact)) && (
          <ul className={styles.menu}>
            {matches.map((g) => (
              <li key={g.id}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => add(g)}>
                  {g.name}
                </button>
              </li>
            ))}
            {query.trim() && !exact && (
              <li>
                <button type="button" className={styles.create}
                  onMouseDown={(e) => e.preventDefault()} onClick={createAndAdd}>
                  <Plus size={14} strokeWidth={2.5} /> Create “{query.trim()}”
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
```

`src/components/edit/GenrePicker.module.css`:

```css
.picker { display: flex; flex-direction: column; gap: 6px; }
.chips { display: flex; flex-wrap: wrap; gap: 4px; }
.chip { display: inline-flex; align-items: center; gap: 4px; font-size: 12px;
  padding: 2px 8px; border-radius: 999px; background: rgba(91,140,255,0.15); color: #5b8cff; }
.chip button { background: none; border: none; color: inherit; cursor: pointer; display: inline-flex; }
.inputWrap { position: relative; }
.input { font: inherit; font-size: 13px; padding: 4px 8px; border-radius: 6px;
  border: 1px solid rgba(128,128,128,0.35); background: transparent; color: inherit; width: 100%; max-width: 220px; }
.menu { position: absolute; z-index: 20; margin-top: 2px; list-style: none; padding: 4px;
  border-radius: 8px; background: var(--background, #fff); box-shadow: 0 6px 20px rgba(0,0,0,0.18);
  max-height: 200px; overflow-y: auto; min-width: 200px; }
.menu button { display: flex; align-items: center; gap: 6px; width: 100%; text-align: left;
  font: inherit; font-size: 13px; padding: 6px 8px; border: none; background: none; color: inherit;
  cursor: pointer; border-radius: 6px; }
.menu button:hover { background: rgba(128,128,128,0.12); }
.create { color: #5b8cff; }
```

- [ ] **Step 3: Render it in the card**

In `AlbumDetailCard.tsx`, import `GenrePicker`, and in the `editing` branch render it under the type select:

```tsx
import GenrePicker from "./edit/GenrePicker";
// ...
{editing ? (
  <>
    <AlbumTypeSelect value={draft.type} onChange={(v) => setField("type", v)} />
    <GenrePicker selected={draft.genres} onChange={(g) => setField("genres", g)} />
  </>
) : (
  <AlbumMetaTiles /* …unchanged… */ />
)}
```

- [ ] **Step 4: Manual verification**

Edit mode: existing genres show as chips; typing filters the dropdown; picking one adds a chip; the ✕ removes it; typing a new name offers **Create "…"** which creates it (via `create_genre`) and adds it. **Save**, reload → chips persist. **Cancel** discards unsaved chip changes.

- [ ] **Step 5: Commit**

```bash
git add src/components/edit/GenrePicker.tsx src/components/edit/GenrePicker.module.css src/components/edit/AlbumEditProvider.tsx src/components/AlbumDetailCard.tsx
git commit -m "feat(ui): genre chip combobox with create, saved with the album"
```

---

## Task 5: Cover uploader (immediate)

**Files:**
- Create: `src/components/edit/CoverUploader.tsx`
- Create: `src/components/edit/CoverUploader.module.css`
- Modify: `src/components/AlbumDetailCard.tsx` (swap cover in edit mode)

- [ ] **Step 1: Write the uploader**

`src/components/edit/CoverUploader.tsx` — wraps `AlbumCover`, adds a click-to-replace overlay, uploads immediately:

```tsx
"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import AlbumCover from "../AlbumCover";
import { uploadAlbumCover } from "@/lib/edit";
import styles from "./CoverUploader.module.css";

export default function CoverUploader({
  albumId, coverUrl, alt, size,
}: {
  albumId: string;
  coverUrl: string | null;
  alt: string;
  size: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(coverUrl);
  const [busy, setBusy] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const next = await uploadAlbumCover(albumId, file);
      // cache-bust so the <img> re-fetches the replaced object
      setUrl(`${next}?v=${Date.now()}`);
    } catch (err) {
      console.error("cover upload", err);
      alert("Cover upload failed: " + (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <AlbumCover coverUrl={url} alt={alt} size={size} priority />
      <button
        type="button"
        className={styles.overlay}
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label="Replace cover"
      >
        <Upload size={20} strokeWidth={2} />
        <span>{busy ? "Uploading…" : "Replace"}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onPick}
      />
    </div>
  );
}
```

`src/components/edit/CoverUploader.module.css`:

```css
.wrap { position: relative; display: inline-block; }
.overlay { position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 4px; border: none; cursor: pointer;
  border-radius: 8px; color: #fff; font: inherit; font-size: 12px;
  background: rgba(0,0,0,0.45); opacity: 0; transition: opacity 0.15s; }
.wrap:hover .overlay, .overlay:focus-visible { opacity: 1; }
.overlay:disabled { opacity: 1; cursor: default; }
```

Uses date-based cache-busting via `Date.now()` — acceptable in a client component (this is not a workflow script).

- [ ] **Step 2: Swap the cover in edit mode**

In `AlbumDetailCard.tsx`, import `CoverUploader` and branch the cover:

```tsx
import CoverUploader from "./edit/CoverUploader";
// ...
{editing ? (
  <CoverUploader albumId={album.id} coverUrl={album.cover_url} alt={album.name} size={165} />
) : (
  <AlbumCover coverUrl={album.cover_url} alt={album.name} size={165} priority />
)}
```

- [ ] **Step 3: Manual verification**

In edit mode, hover the cover → a **Replace** overlay appears. Pick an image → it uploads to the `covers` bucket and the cover updates in place. Reload → the new cover persists (it was written by `set_album_cover` immediately, independent of Save).

- [ ] **Step 4: Commit**

```bash
git add src/components/edit/CoverUploader.tsx src/components/edit/CoverUploader.module.css src/components/AlbumDetailCard.tsx
git commit -m "feat(ui): click-to-replace album cover upload"
```

---

## Task 6: Editable setlist (move up/down, remove, add)

Adds staged setlist structure to the provider and an editable list. Order/membership commit on **Save**; new tracks are created then; removed tracks are unlinked then.

**Files:**
- Modify: `src/components/edit/AlbumEditProvider.tsx` (staged setlist + commit)
- Create: `src/components/edit/EditableSetlist.tsx`
- Create: `src/components/edit/EditableSetlist.module.css`
- Modify: `src/components/AlbumDetailCard.tsx` (swap playlist in edit mode)

- [ ] **Step 1: Stage the setlist in the provider**

Add setlist state alongside the album draft. A setlist row is either an existing track (has `trackId`) or a pending new one (has a temp id + name):

```tsx
export type SetlistItem = { key: string; trackId: string | null; name: string };

// inside the provider component:
const [setlist, setSetlist] = useState<SetlistItem[]>(() =>
  album.tracks.map((t) => ({ key: t.track_id, trackId: t.track_id, name: t.track_name }))
);

const moveItem = useCallback((index: number, delta: number) => {
  setSetlist((list) => {
    const next = list.slice();
    const j = index + delta;
    if (j < 0 || j >= next.length) return list;
    [next[index], next[j]] = [next[j], next[index]];
    return next;
  });
}, []);

const removeItem = useCallback((key: string) => {
  setSetlist((list) => list.filter((i) => i.key !== key));
}, []);

const addItem = useCallback((name: string) => {
  const clean = name.trim();
  if (!clean) return;
  setSetlist((list) => [
    ...list,
    { key: `new-${list.length}-${clean}`, trackId: null, name: clean },
  ]);
}, []);
```

Include setlist in `dirty` (compare ordered keys + any pending/removed):

```tsx
const setlistDirty = useMemo(() => {
  const now = setlist.map((i) => i.trackId ?? `+${i.name}`).join(",");
  const orig = album.tracks.map((t) => t.track_id).join(",");
  return now !== orig;
}, [setlist, album.tracks]);
// combine: const dirty = albumDirty || setlistDirty
```

Extend `save` to commit the setlist after the album fields (order matters — create/remove before reorder):

```tsx
// after updateAlbum / setAlbumGenres:
const originalIds = new Set(album.tracks.map((t) => t.track_id));
const keptIds = new Set(setlist.filter((i) => i.trackId).map((i) => i.trackId as string));

// removed = original tracks no longer present
for (const t of album.tracks) {
  if (!keptIds.has(t.track_id)) await removeTrackFromAlbum(album.id, t.track_id);
}
// created = pending items; assign their new ids in place
const created: Record<string, string> = {};
for (const item of setlist) {
  if (!item.trackId) created[item.key] = await createTrack(album.id, item.name);
}
// final order = each row's real id (existing or newly created)
const orderedIds = setlist.map((i) => i.trackId ?? created[i.key]);
await reorderSetlist(album.id, orderedIds);
```

After commit, a full data refresh is simplest for the setlist (new track ids, latest versions). Use `router.refresh()` from `next/navigation` instead of local mutation for this task:

```tsx
import { useRouter } from "next/navigation";
// const router = useRouter();  // in the component
// at the end of a successful save():
setEditing(false);
router.refresh();
```

Reset `setlist` when `album.tracks` changes (post-refresh) via an effect:

```tsx
useEffect(() => {
  setSetlist(album.tracks.map((t) => ({ key: t.track_id, trackId: t.track_id, name: t.track_name })));
}, [album.tracks]);
```

Expose `setlist`, `moveItem`, `removeItem`, `addItem` on the context value (add them to the type and the `useMemo`). Import `createTrack, removeTrackFromAlbum, reorderSetlist` from `@/lib/edit`.

- [ ] **Step 2: Write the editable list**

`src/components/edit/EditableSetlist.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, X, Plus } from "lucide-react";
import { useAlbumEdit } from "./AlbumEditProvider";
import styles from "./EditableSetlist.module.css";

export default function EditableSetlist() {
  const { setlist, moveItem, removeItem, addItem } = useAlbumEdit();
  const [name, setName] = useState("");

  return (
    <div className={styles.list}>
      {setlist.map((item, i) => (
        <div key={item.key} className={styles.row}>
          <span className={styles.num}>{i + 1}</span>
          <span className={styles.name}>
            {item.name}
            {!item.trackId && <em className={styles.pending}> · new</em>}
          </span>
          <div className={styles.controls}>
            <button type="button" aria-label="Move up" disabled={i === 0}
              onClick={() => moveItem(i, -1)}><ArrowUp size={16} /></button>
            <button type="button" aria-label="Move down" disabled={i === setlist.length - 1}
              onClick={() => moveItem(i, 1)}><ArrowDown size={16} /></button>
            <button type="button" aria-label="Remove" className={styles.remove}
              onClick={() => removeItem(item.key)}><X size={16} /></button>
          </div>
        </div>
      ))}
      <form
        className={styles.add}
        onSubmit={(e) => { e.preventDefault(); addItem(name); setName(""); }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)}
          placeholder="New track name…" aria-label="New track name" />
        <button type="submit" disabled={!name.trim()}><Plus size={16} /> Add</button>
      </form>
      <p className={styles.hint}>Order &amp; track changes apply when you Save. Add audio to a track after saving.</p>
    </div>
  );
}
```

`src/components/edit/EditableSetlist.module.css`:

```css
.list { display: flex; flex-direction: column; gap: 4px; }
.row { display: flex; align-items: center; gap: 8px; padding: 6px 8px;
  border-radius: 6px; background: rgba(91,140,255,0.06); }
.num { width: 18px; color: rgba(128,128,128,0.8); font-size: 13px; }
.name { flex: 1; }
.pending { color: #5b8cff; font-style: italic; font-size: 12px; }
.controls { display: inline-flex; gap: 2px; }
.controls button { background: none; border: none; cursor: pointer; color: inherit;
  padding: 4px; display: inline-flex; border-radius: 4px; }
.controls button:disabled { opacity: 0.3; cursor: default; }
.remove { color: #e5484d; }
.add { display: flex; gap: 6px; margin-top: 8px; }
.add input { flex: 1; font: inherit; font-size: 13px; padding: 6px 8px; border-radius: 6px;
  border: 1px solid rgba(128,128,128,0.35); background: transparent; color: inherit; }
.add button { display: inline-flex; align-items: center; gap: 4px; font: inherit; font-size: 13px;
  padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(128,128,128,0.35);
  background: rgba(128,128,128,0.08); color: inherit; cursor: pointer; }
.hint { font-size: 12px; color: rgba(128,128,128,0.85); margin-top: 6px; }
```

- [ ] **Step 3: Swap the playlist in edit mode**

In `AlbumDetailCard.tsx`, import `EditableSetlist` and branch the trailing playlist:

```tsx
import EditableSetlist from "./edit/EditableSetlist";
// ...
{editing ? (
  <EditableSetlist />
) : (
  <AlbumPlaylist tracks={album.tracks} variant="detailed" lyrics={lyrics} />
)}
```

- [ ] **Step 4: Manual verification**

Edit mode shows the setlist with ↑/↓/✕ per row and an **Add** field. Reorder two tracks, add a "new" row, remove one, then **Save** → page refreshes with the new order/membership persisted (verify by reloading). **Cancel** before saving discards all of it. Confirm the listener view (signed out) shows tracks in the saved order.

- [ ] **Step 5: Commit**

```bash
git add src/components/edit/EditableSetlist.tsx src/components/edit/EditableSetlist.module.css src/components/edit/AlbumEditProvider.tsx src/components/AlbumDetailCard.tsx
git commit -m "feat(ui): editable setlist — move/remove/add tracks, committed on save"
```

---

## Task 7: Versions panel (list, add-with-upload, edit, delete)

Per-track version management. These are **immediate** actions (not part of Save), and only appear for **persisted** tracks (a just-added track must be saved first so it has a real id). Rendered as an expandable panel under each track row in the editable setlist.

**Files:**
- Create: `src/components/edit/VersionsPanel.tsx`
- Create: `src/components/edit/VersionsPanel.module.css`
- Modify: `src/components/edit/EditableSetlist.tsx` (expand a row into the panel)

- [ ] **Step 1: Write the panel**

`src/components/edit/VersionsPanel.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import type { AlbumVersion } from "@/lib/types";
import {
  listTrackVersions, createVersionWithFile, updateVersion, deleteVersion, VERSION_STATUSES,
} from "@/lib/edit";
import styles from "./VersionsPanel.module.css";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function VersionsPanel({ trackId }: { trackId: string }) {
  const [versions, setVersions] = useState<AlbumVersion[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<string>("demo");
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = () =>
    listTrackVersions(trackId).then(setVersions).catch((e) => console.error("load versions", e));

  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [trackId]);

  async function onAdd() {
    const file = fileRef.current?.files?.[0];
    if (!file) { alert("Pick an audio file first."); return; }
    if (!name.trim()) { alert("Name the version first."); return; }
    setBusy(true);
    try {
      await createVersionWithFile(trackId, name.trim(), status, today(), file);
      setName("");
      if (fileRef.current) fileRef.current.value = "";
      await reload();
    } catch (e) {
      console.error("create version", e);
      alert("Upload failed: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onStatusChange(v: AlbumVersion, next: string) {
    setVersions((list) => list?.map((x) => (x.id === v.id ? { ...x, status: next } : x)) ?? null);
    try {
      await updateVersion(v.id, v.name, next, v.release_date);
    } catch (e) {
      console.error("update version", e);
      await reload();
    }
  }

  async function onDelete(v: AlbumVersion) {
    if (!confirm(`Delete version “${v.name}”?`)) return;
    try {
      await deleteVersion(v.id);
      await reload();
    } catch (e) {
      console.error("delete version", e);
      alert("Delete failed: " + (e as Error).message);
    }
  }

  return (
    <div className={styles.panel}>
      {versions === null ? (
        <p className={styles.muted}>Loading versions…</p>
      ) : versions.length === 0 ? (
        <p className={styles.muted}>No versions yet.</p>
      ) : (
        <ul className={styles.versions}>
          {versions.map((v) => (
            <li key={v.id} className={styles.version}>
              <span className={styles.vName}>{v.name}</span>
              <select value={v.status} aria-label={`Status of ${v.name}`}
                onChange={(e) => onStatusChange(v, e.target.value)}>
                {VERSION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className={styles.date}>{v.release_date}</span>
              {v.resource_url ? <span className={styles.ok}>♪</span> : <span className={styles.muted}>no file</span>}
              <button type="button" aria-label={`Delete ${v.name}`} className={styles.del}
                onClick={() => onDelete(v)}><Trash2 size={15} /></button>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.add}>
        <input value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Version name…" aria-label="New version name" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="New version status">
          {VERSION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input ref={fileRef} type="file" accept="audio/*,.m4a" aria-label="Audio file" />
        <button type="button" onClick={onAdd} disabled={busy}>
          <Upload size={15} /> {busy ? "Uploading…" : "Add version"}
        </button>
      </div>
    </div>
  );
}
```

`src/components/edit/VersionsPanel.module.css`:

```css
.panel { padding: 8px 10px; margin: 2px 0 6px 26px; border-left: 2px solid rgba(91,140,255,0.3); }
.muted { color: rgba(128,128,128,0.85); font-size: 12px; }
.versions { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.version { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.vName { flex: 1; }
.date { color: rgba(128,128,128,0.8); font-size: 12px; }
.ok { color: #30a46c; }
.del { background: none; border: none; color: #e5484d; cursor: pointer; display: inline-flex; }
.add { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.add input[type="text"], .add input:not([type]), .add select { font: inherit; font-size: 13px;
  padding: 5px 7px; border-radius: 6px; border: 1px solid rgba(128,128,128,0.35);
  background: transparent; color: inherit; }
.add button { display: inline-flex; align-items: center; gap: 4px; font: inherit; font-size: 13px;
  padding: 5px 10px; border-radius: 6px; border: 1px solid #5b8cff; background: #5b8cff; color: #fff; cursor: pointer; }
.add button:disabled { opacity: 0.6; cursor: default; }
```

- [ ] **Step 2: Expand rows into the panel**

In `EditableSetlist.tsx`, add a per-row expand toggle that renders `VersionsPanel` for persisted tracks only. Add state and a button:

```tsx
import { ChevronDown, ChevronRight } from "lucide-react";
import VersionsPanel from "./VersionsPanel";
// ...
const [openKey, setOpenKey] = useState<string | null>(null);
// inside the row, before the controls:
<button type="button" aria-label="Toggle versions" className={styles.expand}
  disabled={!item.trackId}
  onClick={() => setOpenKey((k) => (k === item.key ? null : item.key))}>
  {openKey === item.key ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
</button>
// after the row's closing </div>, still inside the map:
{openKey === item.key && item.trackId && <VersionsPanel trackId={item.trackId} />}
```

Add a `.expand` style mirroring `.controls button` (disabled when the track isn't saved yet):

```css
.expand { background: none; border: none; cursor: pointer; color: inherit; padding: 4px;
  display: inline-flex; border-radius: 4px; }
.expand:disabled { opacity: 0.3; cursor: default; }
```

- [ ] **Step 3: Manual verification**

In edit mode, expand a saved track → its versions list loads. **Add version**: name it, pick a status, choose an `.m4a`, click **Add version** → it uploads to the `versions` bucket, links via `create_version`, and appears in the list with a ♪ (file present). Reload the album (listener view) → the track is playable / the latest version reflects. Change a version's status (persists immediately). Delete a version (confirms, then removed). Confirm a **newly-added, not-yet-saved** track shows a disabled expand (must Save first).

- [ ] **Step 4: Commit**

```bash
git add src/components/edit/VersionsPanel.tsx src/components/edit/VersionsPanel.module.css src/components/edit/EditableSetlist.tsx src/components/edit/EditableSetlist.module.css
git commit -m "feat(ui): per-track versions panel with audio upload"
```

---

## Self-review notes (for the implementer)

- **Spec §8 coverage:** member-gated edit toggle (T3), contenteditable name/description (T3), type select (T3), genre chip combobox (T4), click-to-replace cover (T5), setlist move/remove/add (T6), per-track versions + upload (T7), explicit Save/Cancel with staged album+setlist and immediate file ops (T3/T6/T7). `canEdit` is computed client-side from `artist_members` (cache-safe), and every write is additionally guarded server-side by the Plan 1 RPCs.
- **Deferred / out of scope (as agreed):** creating a brand-new album from zero; per-track cover editing; Works/variants; tightened per-artist storage policies.
- **Known simplifications to revisit:** save errors use `alert()` (fine for a solo tool; swap for a toast later); the setlist commit is sequential RPC calls (not a single transaction) — acceptable because each RPC is atomic and a partial failure is recoverable by re-saving; deleting a version leaves its audio object in the `versions` bucket (storage GC is a deferred follow-up from Plan 1).
- **Dependency note:** no new packages — reorder uses up/down controls per your choice.
- **After Task 7:** run `npx tsc --noEmit` to confirm the whole edit surface type-checks before finishing the branch.
