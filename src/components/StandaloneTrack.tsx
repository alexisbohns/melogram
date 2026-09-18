"use client";

import { useState } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { toPlayerTrack, usePlayer } from "@/player/PlayerProvider";
import { formatTime } from "@/player/durations";
import { paletteVars } from "@/lib/palettes";
import { useAlbumPalette } from "@/lib/albumPalette";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import type { Track } from "@/lib/types";
import LikeButton from "./LikeButton";
import styles from "./StandaloneTrack.module.css";

/**
 * Longest description shown before it is clamped behind a "More" button. Kept
 * in characters (not CSS lines) so every row collapses to the same height
 * whatever the viewport width.
 */
const DESCRIPTION_LIMIT = 100;

/**
 * Cut `text` to at most `limit` characters, backing up to the last word break
 * so the clamp never lands mid-word, and mark it with an ellipsis.
 */
function clamp(text: string, limit: number) {
  if (text.length <= limit) return text;
  const head = text.slice(0, limit);
  const lastSpace = head.lastIndexOf(" ");
  const cut = lastSpace > limit * 0.6 ? head.slice(0, lastSpace) : head;
  return `${cut.trimEnd()}…`;
}

type Props = {
  track: Track;
  /** The surrounding tab's tracks — queued together on play. */
  queue: Track[];
};

/**
 * A track shown outside its album: the album cover doubles as the play control
 * (it becomes a pause button while this track is playing), the heading pairs
 * the track name with its album, and the description sits underneath like the
 * detailed album-page row — clamped to {@link DESCRIPTION_LIMIT} characters
 * with a "More" toggle when it runs longer.
 */
export default function StandaloneTrack({ track, queue }: Props) {
  const m = useMessages();
  const { current, isPlaying, toggle, playFrom } = usePlayer();
  const [expanded, setExpanded] = useState(false);
  const palette = useAlbumPalette({
    id: track.album_id ?? undefined,
    name: track.album_name ?? undefined,
    theme: track.album_theme ?? undefined,
    coverUrl: track.album_cover_url,
  });

  const playable = Boolean(track.latest_resource_url);
  const active = current?.id === track.track_id && isPlaying;

  const description = track.track_description ?? "";
  const clamped = clamp(description, DESCRIPTION_LIMIT);
  const clampable = clamped !== description;

  const onPlayClick = () => {
    if (!playable) return;
    if (current?.id === track.track_id) {
      toggle();
      return;
    }
    const playableTracks = queue.filter((t) => t.latest_resource_url);
    playFrom(
      playableTracks.map((t) => toPlayerTrack(t)),
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

      {description && (
        <p className={styles.description}>
          {clampable && !expanded ? clamped : description}
          {clampable && (
            <button
              type="button"
              className={styles.more}
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? m.track.less : m.track.more}
            </button>
          )}
        </p>
      )}
    </li>
  );
}
