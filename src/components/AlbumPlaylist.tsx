import type { Track, TrackLyrics } from "@/lib/types";
import AlbumTrack from "./AlbumTrack";
import styles from "./AlbumPlaylist.module.css";

type Props = {
  tracks: Track[];
  variant?: "simple" | "detailed";
  lyrics?: TrackLyrics;
  /** The track whose page we're on, if any — marks that row as `current`. */
  currentTrackId?: string;
};

export default function AlbumPlaylist({
  tracks,
  variant = "simple",
  lyrics = {},
  currentTrackId,
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
          queueLyrics={lyrics}
          current={track.track_id === currentTrackId}
        />
      ))}
    </ul>
  );
}
