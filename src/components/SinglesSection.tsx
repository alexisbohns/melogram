"use client";

import { useState } from "react";
import type { AlbumWithTracks } from "@/lib/types";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import { ALL_GENRES, useGenreTabs } from "./useGenreTabs";
import SectionHeader from "./SectionHeader";
import StandaloneTrack from "./StandaloneTrack";
import styles from "./TracksSection.module.css";
import rail from "./Rail.module.css";

/**
 * Home "Singles" section: one-track releases, shown as the standalone track
 * rows the Tracks section uses rather than as album cards.
 */
export default function SinglesSection({
  singles,
}: {
  singles: AlbumWithTracks[];
}) {
  const m = useMessages();
  const [active, setActive] = useState(ALL_GENRES);
  const { tabs, filter } = useGenreTabs(singles);

  if (singles.length === 0) return null;

  // A single is its one track; the whole visible row queues together on play.
  const tracks = filter(active).flatMap((album) => album.tracks.slice(0, 1));

  return (
    <section className={styles.section}>
      <SectionHeader
        title={m.sections.singles}
        tabs={tabs}
        activeKey={active}
        onSelect={setActive}
      />
      {/* Keyed per tab — see TracksSection: a fresh scroller per filter. */}
      <ul key={active} className={rail.rail}>
        {tracks.map((track) => (
          <StandaloneTrack key={track.track_id} track={track} queue={tracks} />
        ))}
      </ul>
    </section>
  );
}
