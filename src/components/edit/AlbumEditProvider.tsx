"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { AlbumWithTracks, Genre } from "@/lib/types";
import {
  createTrack,
  getMyArtistIds,
  removeTrackFromAlbum,
  reorderSetlist,
  setAlbumGenres,
  updateAlbum,
} from "@/lib/edit";

type Draft = {
  name: string;
  description: string;
  type: string;
  genres: Genre[];
};

export type SetlistItem = { key: string; trackId: string | null; name: string };

type EditContextValue = {
  canEdit: boolean;
  editing: boolean;
  saving: boolean;
  dirty: boolean;
  draft: Draft;
  setlist: SetlistItem[];
  startEditing: () => void;
  cancel: () => void;
  save: () => Promise<void>;
  setField: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  moveItem: (index: number, delta: number) => void;
  removeItem: (key: string) => void;
  addItem: (name: string) => void;
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
    key: t.track_id,
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
  const [draft, setDraft] = useState<Draft>(() => draftFrom(album));
  const [setlist, setSetlist] = useState<SetlistItem[]>(() => setlistFrom(album));

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

  // Re-sync the staged setlist after the server data changes (e.g. router.refresh()).
  useEffect(() => {
    setSetlist(setlistFrom(album));
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
    const now = setlist.map((i) => i.trackId ?? `+${i.name}`).join(",");
    const orig = album.tracks.map((t) => t.track_id).join(",");
    return now !== orig;
  }, [setlist, album.tracks]);

  const dirty = albumDirty || setlistDirty;

  const startEditing = useCallback(() => setEditing(true), []);

  const cancel = useCallback(() => {
    setDraft(draftFrom(album));
    setSetlist(setlistFrom(album));
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

  const save = useCallback(async () => {
    setSaving(true);
    try {
      if (albumDirty) {
        await updateAlbum(album.id, draft.name, draft.description || null, draft.type);
        await setAlbumGenres(album.id, draft.genres.map((g) => g.id));
      }
      if (setlistDirty) {
        const keptIds = new Set(
          setlist.filter((i) => i.trackId).map((i) => i.trackId as string)
        );
        for (const t of album.tracks) {
          if (!keptIds.has(t.track_id)) await removeTrackFromAlbum(album.id, t.track_id);
        }
        const created: Record<string, string> = {};
        for (const item of setlist) {
          if (!item.trackId) created[item.key] = await createTrack(album.id, item.name);
        }
        const orderedIds = setlist.map((i) => i.trackId ?? created[i.key]);
        if (orderedIds.length) await reorderSetlist(album.id, orderedIds);
      }
      setEditing(false);
      router.refresh();
    } catch (err) {
      console.error("Save failed", err);
      alert("Save failed: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [album, draft, albumDirty, setlist, setlistDirty, router]);

  const value = useMemo<EditContextValue>(
    () => ({
      canEdit,
      editing,
      saving,
      dirty,
      draft,
      setlist,
      startEditing,
      cancel,
      save,
      setField,
      moveItem,
      removeItem,
      addItem,
      album,
    }),
    [
      canEdit, editing, saving, dirty, draft, setlist,
      startEditing, cancel, save, setField, moveItem, removeItem, addItem, album,
    ]
  );

  return <EditContext.Provider value={value}>{children}</EditContext.Provider>;
}
