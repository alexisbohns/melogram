import type { Track } from "@/lib/types";
import styles from "./AlbumInfos.module.css";

/** "N songs · M min" line — the minutes appear once every playable track has a
    known duration (server-provided; null while a version is still unmeasured). */
export default function AlbumInfos({ tracks }: { tracks: Track[] }) {
  const count = tracks.length;
  const songs = `${count} ${count === 1 ? "song" : "songs"}`;

  const playable = tracks.filter((t) => t.latest_resource_url);
  const measured = playable.every((t) => typeof t.duration === "number");
  const total = measured
    ? playable.reduce((sum, t) => sum + (t.duration ?? 0), 0)
    : null;
  const minutes =
    total !== null ? ` · ${Math.max(1, Math.round(total / 60))} min` : "";

  return (
    <p className={styles.infos}>
      {songs}
      {minutes}
    </p>
  );
}
