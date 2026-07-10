"use client";

import { useTotalDuration } from "@/player/durations";
import type { Track } from "@/lib/types";
import styles from "./AlbumInfos.module.css";

/** "N songs · M min" line — duration appears once audio metadata resolves. */
export default function AlbumInfos({ tracks }: { tracks: Track[] }) {
  const total = useTotalDuration(tracks.map((t) => t.latest_resource_url));

  const count = tracks.length;
  const songs = `${count} ${count === 1 ? "song" : "songs"}`;
  const minutes = total !== null ? ` · ${Math.max(1, Math.round(total / 60))} min` : "";

  return (
    <p className={styles.infos}>
      {songs}
      {minutes}
    </p>
  );
}
