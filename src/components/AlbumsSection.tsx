"use client";

import { useRef, useState } from "react";
import type { AlbumWithTracks } from "@/lib/types";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import { ALL_GENRES, useGenreTabs } from "./useGenreTabs";
import SectionHeader from "./SectionHeader";
import AlbumCard from "./AlbumCard";
import styles from "./AlbumsSection.module.css";
import rail from "./Rail.module.css";

/** Home "Albums" section: every multi-track release, filtered by genre tabs. */
export default function AlbumsSection({ albums }: { albums: AlbumWithTracks[] }) {
  const m = useMessages();
  const [active, setActive] = useState(ALL_GENRES);
  const { tabs, filter } = useGenreTabs(albums);
  const railRef = useRef<HTMLDivElement>(null);

  if (albums.length === 0) return null;

  return (
    <section className={styles.section}>
      <SectionHeader
        title={m.sections.albums}
        tabs={tabs}
        activeKey={active}
        onSelect={setActive}
        scrollerRef={railRef}
      />
      {/* Keyed per tab — see TracksSection: a fresh scroller per filter. */}
      <div key={active} ref={railRef} className={`${rail.rail} ${rail.bleed}`}>
        {filter(active).map((album) => (
          <div key={album.id} className={rail.item}>
            <AlbumCard album={album} />
          </div>
        ))}
      </div>
    </section>
  );
}
