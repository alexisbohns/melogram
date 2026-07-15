"use client";

import { useMemo, useState } from "react";
import type { AlbumWithTracks } from "@/lib/types";
import { albumFilterGenres } from "@/lib/genres";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import SectionHeader, { type SectionTab } from "./SectionHeader";
import AlbumCard from "./AlbumCard";
import styles from "./AlbumsSection.module.css";

const ALL = "__all__";

/** Home "Albums" section: every album, filtered by genre tabs. */
export default function AlbumsSection({ albums }: { albums: AlbumWithTracks[] }) {
  const m = useMessages();
  const [active, setActive] = useState(ALL);

  // album id → its filter genres, computed once.
  const genresByAlbum = useMemo(
    () => new Map(albums.map((a) => [a.id, albumFilterGenres(a)])),
    [albums]
  );

  // Tabs = "All" + each genre, most-used first (then alphabetical).
  const tabs = useMemo<SectionTab[]>(() => {
    const counts = new Map<string, number>();
    for (const list of genresByAlbum.values()) {
      for (const name of list) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const genres = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name]) => ({ key: name, label: name }));
    return [{ key: ALL, label: m.sections.all }, ...genres];
  }, [genresByAlbum, m.sections.all]);

  const visible =
    active === ALL
      ? albums
      : albums.filter((a) => genresByAlbum.get(a.id)?.includes(active));

  return (
    <section className={styles.section}>
      <SectionHeader
        title={m.sections.albums}
        tabs={tabs}
        activeKey={active}
        onSelect={setActive}
      />
      <div className={styles.grid}>
        {visible.map((album) => (
          <AlbumCard key={album.id} album={album} />
        ))}
      </div>
    </section>
  );
}
