"use client";

import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { toPlayerTrack, usePlayer } from "@/player/PlayerProvider";
import { formatTime } from "@/player/durations";
import { getPalette, paletteVars } from "@/lib/palettes";
import type { Track } from "@/lib/types";
import LikeButton from "./LikeButton";
import styles from "./StandaloneTrack.module.css";

type Props = {
  track: Track;
  /** The surrounding tab's tracks — queued together on play. */
  queue: Track[];
};

/**
 * A track shown outside its album: the album cover doubles as the play control
 * (it becomes a pause button while this track is playing), the heading pairs
 * the track name with its album, and the description sits underneath like the
 * detailed album-page row.
 */
export default function StandaloneTrack({ track, queue }: Props) {
  const { current, isPlaying, toggle, playFrom } = usePlayer();
  const palette = getPalette({
    id: track.album_id ?? undefined,
    name: track.album_name ?? undefined,
    theme: track.album_theme ?? undefined,
  });

  const playable = Boolean(track.latest_resource_url);
  const active = current?.id === track.track_id && isPlaying;

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
    <li className={styles.track} style={paletteVars(palette)}>
      <div className={styles.header}>
        <button
          type="button"
          className={`${styles.cover} ${active ? styles.playing : ""}`}
          disabled={!playable}
          aria-label={
            active ? `Pause ${track.track_name}` : `Play ${track.track_name}`
          }
          onClick={onPlayClick}
        >
          {active ? (
            <Pause size={20} strokeWidth={2} />
          ) : (
            <>
              {track.album_cover_url && (
                <Image
                  src={track.album_cover_url}
                  alt=""
                  fill
                  sizes="40px"
                  className={styles.coverImg}
                />
              )}
              <span className={styles.texture} />
              <span className={styles.hint} aria-hidden>
                <Play size={20} strokeWidth={2} />
              </span>
            </>
          )}
        </button>

        <div className={styles.heading}>
          <span className={`${styles.name} ${active ? "shimmer" : ""}`}>
            {track.track_name}
          </span>
          {track.album_name && (
            <span className={styles.album}>{track.album_name}</span>
          )}
        </div>

        <div className={styles.footer}>
          <span className={styles.time}>
            {track.duration !== null ? formatTime(track.duration) : "–:–"}
          </span>
          <LikeButton
            trackId={track.track_id}
            likeCount={track.like_count ?? 0}
          />
        </div>
      </div>

      {track.track_description && (
        <p className={styles.description}>{track.track_description}</p>
      )}
    </li>
  );
}
