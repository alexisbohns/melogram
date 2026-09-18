"use client";

import { useMemo } from "react";
import type { AlbumWithTracks } from "@/lib/types";
import { albumFilterGenres } from "@/lib/genres";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import type { SectionTab } from "./SectionHeader";

export const ALL_GENRES = "__all__";

/**
 * Genre tabs for a home section: "All" plus every genre the given releases
 * carry, most-used first (then alphabetical), with the matching filter.
 */
export function useGenreTabs(albums: AlbumWithTracks[]) {
  const m = useMessages();

  // album id → its filter genres, computed once.
  const genresByAlbum = useMemo(
    () => new Map(albums.map((a) => [a.id, albumFilterGenres(a)])),
    [albums]
  );

  const tabs = useMemo<SectionTab[]>(() => {
    const counts = new Map<string, number>();
    for (const list of genresByAlbum.values()) {
      for (const name of list) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const genres = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name]) => ({ key: name, label: name }));
    return [{ key: ALL_GENRES, label: m.sections.all }, ...genres];
  }, [genresByAlbum, m.sections.all]);

  const filter = (active: string) =>
    active === ALL_GENRES
      ? albums
      : albums.filter((a) => genresByAlbum.get(a.id)?.includes(active));

  return { tabs, filter };
}
