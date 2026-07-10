"use client";

import { useState } from "react";
import { Heart, Mic, Pause, Play } from "lucide-react";
import { usePlayer } from "@/player/PlayerProvider";
import { formatTime, useDuration } from "@/player/durations";
import type { Track } from "@/lib/types";
import LyricsSheet from "./LyricsSheet";
import styles from "./AlbumTrack.module.css";

type Props = {
  track: Track;
  variant?: "simple" | "detailed";
  lyrics?: string | null;
};

export default function AlbumTrack({
  track,
  variant = "simple",
  lyrics = null,
}: Props) {
  const { currentId, isPlaying, toggle } = usePlayer();
  const duration = useDuration(track.latest_resource_url);
  const [lyricsOpen, setLyricsOpen] = useState(false);

  const playable = Boolean(track.latest_resource_url);
  const active = currentId === track.track_id && isPlaying;
  const detailed = variant === "detailed";

  return (
    <li className={`${styles.track} ${detailed ? styles.detailed : ""}`}>
      <button
        type="button"
        className={`${styles.play} ${active ? styles.playing : ""}`}
        disabled={!playable}
        aria-label={active ? `Pause ${track.track_name}` : `Play ${track.track_name}`}
        onClick={() =>
          playable &&
          toggle({
            id: track.track_id,
            name: track.track_name,
            url: track.latest_resource_url!,
          })
        }
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
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Like (coming soon)"
          disabled
        >
          <Heart size={20} strokeWidth={2} />
        </button>
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
