"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
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
      canEdit,
      editing,
      saving,
      dirty,
      draft,
      startEditing,
      cancel,
      save,
      setField,
      album,
    }),
    [canEdit, editing, saving, dirty, draft, startEditing, cancel, save, setField, album]
  );

  return <EditContext.Provider value={value}>{children}</EditContext.Provider>;
}
