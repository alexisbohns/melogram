"use client";

import { useState } from "react";
import { Mic, Pause, Play } from "lucide-react";
import { toPlayerTrack, usePlayer } from "@/player/PlayerProvider";
import { formatTime, useDuration } from "@/player/durations";
import type { Track } from "@/lib/types";
import LikeButton from "./LikeButton";
import LyricsSheet from "./LyricsSheet";
import styles from "./AlbumTrack.module.css";

type Props = {
  track: Track;
  /** All tracks of the surrounding playlist — queued together on play. */
  queue: Track[];
  variant?: "simple" | "detailed";
  lyrics?: string | null;
};

export default function AlbumTrack({
  track,
  queue,
  variant = "simple",
  lyrics = null,
}: Props) {
  const { current, isPlaying, toggle, playFrom } = usePlayer();
  const duration = useDuration(track.latest_resource_url);
  const [lyricsOpen, setLyricsOpen] = useState(false);

  const playable = Boolean(track.latest_resource_url);
  const active = current?.id === track.track_id && isPlaying;
  const detailed = variant === "detailed";

  const onPlayClick = () => {
    if (!playable) return;
    if (current?.id === track.track_id) {
      toggle();
      return;
    }
    const playableTracks = queue.filter((t) => t.latest_resource_url);
    playFrom(
      playableTracks.map(toPlayerTrack),
      playableTracks.findIndex((t) => t.track_id === track.track_id)
    );
  };

  return (
    <li className={`${styles.track} ${detailed ? styles.detailed : ""}`}>
      <button
        type="button"
        className={`${styles.play} ${active ? styles.playing : ""}`}
        disabled={!playable}
        aria-label={active ? `Pause ${track.track_name}` : `Play ${track.track_name}`}
        onClick={onPlayClick}
      >
        {active ? (
          <Pause size={24} strokeWidth={2} />
        ) : (
          <Play size={24} strokeWidth={2} />
        )}
      </button>

      <span className={styles.name}>{track.track_name}</span>

      <div className={styles.footer}>
        <span className={styles.time}>
          {duration !== null ? formatTime(duration) : "–:–"}
        </span>
        <LikeButton trackId={track.track_id} likeCount={track.like_count ?? 0} />
        {detailed && (
          <button
            type="button"
            className={styles.iconButton}
            aria-label={`Lyrics of ${track.track_name}`}
            disabled={!lyrics}
            onClick={() => setLyricsOpen(true)}
          >
            <Mic size={20} strokeWidth={2} />
          </button>
        )}
      </div>

      {detailed && track.track_description && (
        <p className={styles.description}>{track.track_description}</p>
      )}

      {detailed && lyrics && (
        <LyricsSheet
          open={lyricsOpen}
          onClose={() => setLyricsOpen(false)}
          trackName={track.track_name}
          lyrics={lyrics}
        />
      )}
    </li>
  );
}
