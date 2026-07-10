import type { Track, TrackLyrics } from "@/lib/types";
import AlbumTrack from "./AlbumTrack";
import styles from "./AlbumPlaylist.module.css";

type Props = {
  tracks: Track[];
  variant?: "simple" | "detailed";
  lyrics?: TrackLyrics;
};

export default function AlbumPlaylist({
  tracks,
  variant = "simple",
  lyrics = {},
}: Props) {
  if (tracks.length === 0) return null;

  return (
    <ul className={styles.playlist}>
      {tracks.map((track) => (
        <AlbumTrack
          key={track.track_id}
          track={track}
          queue={tracks}
          variant={variant}
          lyrics={lyrics[track.track_id] ?? null}
        />
      ))}
    </ul>
  );
}
