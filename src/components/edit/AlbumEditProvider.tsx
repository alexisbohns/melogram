"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { AlbumWithTracks, Genre } from "@/lib/types";
import {
  getMyArtistIds,
  removeTrackFromAlbum,
  reorderSetlist,
  setAlbumGenres,
  updateAlbum,
} from "@/lib/edit";
import { revalidateContent } from "@/lib/revalidate";

type Draft = {
  name: string;
  description: string;
  type: string;
  genres: Genre[];
};

export type SetlistItem = { trackId: string; name: string };

type EditContextValue = {
  canEdit: boolean;
  editing: boolean;
  saving: boolean;
  dirty: boolean;
  saveError: string | null;
  draft: Draft;
  setlist: SetlistItem[];
  startEditing: () => void;
  cancel: () => void;
  save: () => Promise<void>;
  setField: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  moveItem: (index: number, delta: number) => void;
  removeItem: (trackId: string) => void;
  /** Purge the route cache and re-fetch server data (after a drawer commit). */
  refresh: () => Promise<void>;
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
    genres: album.genres,
  };
}

function setlistFrom(album: AlbumWithTracks): SetlistItem[] {
  return album.tracks.map((t) => ({
    trackId: t.track_id,
    name: t.track_name,
  }));
}

export function AlbumEditProvider({
  album,
  children,
}: {
  album: AlbumWithTracks;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [canEdit, setCanEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(album));
  const [setlist, setSetlist] = useState<SetlistItem[]>(() => setlistFrom(album));
  // Tracks the user removed from the staged setlist (unlinked on Save).
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());
  // Mirror for the merge effect below, which must read the current removals
  // without re-running on every removal. Declared before it so it syncs first.
  const removedRef = useRef(removedIds);
  useEffect(() => {
    removedRef.current = removedIds;
  }, [removedIds]);

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

  // Merge fresh server data into the staged setlist after every refresh
  // (drawer commits refresh mid-session): keep the staged order and staged
  // removals, refresh names, drop tracks deleted server-side, and append
  // tracks created server-side. A blind reset would wipe staged work.
  useEffect(() => {
    const server = new Map(album.tracks.map((t) => [t.track_id, t.track_name]));
    setSetlist((prev) => {
      const staged = new Set(prev.map((i) => i.trackId));
      const kept = prev
        .filter((i) => server.has(i.trackId))
        .map((i) => ({ trackId: i.trackId, name: server.get(i.trackId)! }));
      const added = album.tracks
        .filter(
          (t) => !staged.has(t.track_id) && !removedRef.current.has(t.track_id)
        )
        .map((t) => ({ trackId: t.track_id, name: t.track_name }));
      return [...kept, ...added];
    });
    setRemovedIds((prev) => {
      const next = new Set([...prev].filter((id) => server.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [album.tracks]);

  const albumDirty = useMemo(() => {
    const a = draft.genres.map((g) => g.id).slice().sort().join(",");
    const b = album.genres.map((g) => g.id).slice().sort().join(",");
    return (
      draft.name !== album.name ||
      draft.description !== (album.description ?? "") ||
      draft.type !== (album.type ?? "album") ||
      a !== b
    );
  }, [draft, album]);

  const setlistDirty = useMemo(() => {
    const serverOrder = album.tracks
      .map((t) => t.track_id)
      .filter((id) => !removedIds.has(id));
    return (
      removedIds.size > 0 ||
      setlist.map((i) => i.trackId).join(",") !== serverOrder.join(",")
    );
  }, [setlist, removedIds, album.tracks]);

  const dirty = albumDirty || setlistDirty;

  const startEditing = useCallback(() => {
    setSaveError(null);
    setEditing(true);
  }, []);

  const cancel = useCallback(() => {
    setDraft(draftFrom(album));
    setSetlist(setlistFrom(album));
    setRemovedIds(new Set());
    setSaveError(null);
    setEditing(false);
  }, [album]);

  const setField = useCallback(
    <K extends keyof Draft>(key: K, value: Draft[K]) =>
      setDraft((d) => ({ ...d, [key]: value })),
    []
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

  const removeItem = useCallback((trackId: string) => {
    setSetlist((list) => list.filter((i) => i.trackId !== trackId));
    setRemovedIds((prev) => new Set(prev).add(trackId));
  }, []);

  const refresh = useCallback(async () => {
    await revalidateContent();
    router.refresh();
  }, [router]);

  const save = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      if (albumDirty) {
        await updateAlbum(album.id, draft.name, draft.description || null, draft.type);
        await setAlbumGenres(album.id, draft.genres.map((g) => g.id));
      }
      if (setlistDirty) {
        const serverIds = new Set(album.tracks.map((t) => t.track_id));
        for (const id of removedIds) {
          if (serverIds.has(id)) await removeTrackFromAlbum(album.id, id);
        }
        const orderedIds = setlist
          .map((i) => i.trackId)
          .filter((id) => serverIds.has(id));
        if (orderedIds.length) await reorderSetlist(album.id, orderedIds);
        // Clear only the snapshot this save processed — removals staged
        // while the RPCs were in flight must survive to the next save.
        setRemovedIds(
          (prev) => new Set([...prev].filter((id) => !removedIds.has(id)))
        );
      }
      setEditing(false);
      await refresh();
    } catch (err) {
      console.error("Save failed", err);
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [album, draft, albumDirty, setlist, setlistDirty, removedIds, refresh]);

  const value = useMemo<EditContextValue>(
    () => ({
      canEdit,
      editing,
      saving,
      dirty,
      saveError,
      draft,
      setlist,
      startEditing,
      cancel,
      save,
      setField,
      moveItem,
      removeItem,
      refresh,
      album,
    }),
    [
      canEdit, editing, saving, dirty, saveError, draft, setlist,
      startEditing, cancel, save, setField, moveItem, removeItem, refresh, album,
    ]
  );

  return <EditContext.Provider value={value}>{children}</EditContext.Provider>;
}
