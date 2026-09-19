"use client";

import Image from "next/image";
import Link from "next/link";
import { Pause, Play } from "lucide-react";
import { toPlayerTrack, usePlayer } from "@/player/PlayerProvider";
import { formatTime } from "@/player/durations";
import { paletteVars } from "@/lib/palettes";
import { useAlbumPalette } from "@/lib/albumPalette";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { localized } from "@/lib/i18n/config";
import type { Track } from "@/lib/types";
import LikeButton from "./LikeButton";
import styles from "./StandaloneTrack.module.css";

type Props = {
  track: Track;
  /** The surrounding tab's tracks — queued together on play. */
  queue: Track[];
};

/**
 * A track shown outside its album: the cover and heading pair the track name
 * with its album, the description follows like the detailed album-page row,
 * and a controls row closes the item with play / duration / like.
 */
export default function StandaloneTrack({ track, queue }: Props) {
  const { current, isPlaying, toggle, playFrom } = usePlayer();
  const locale = useLocale();
  const palette = useAlbumPalette({
    id: track.album_id ?? undefined,
    name: track.album_name ?? undefined,
    theme: track.album_theme ?? undefined,
    coverUrl: track.album_cover_url,
  });

  const playable = Boolean(track.latest_resource_url);
  const active = current?.id === track.track_id && isPlaying;
  const description = localized(
    track.track_description,
    track.track_description_fr,
    locale
  );

  const onPlayClick = () => {
    if (!playable) return;
    if (current?.id === track.track_id) {
      toggle();
      return;
    }
    const playableTracks = queue.filter((t) => t.latest_resource_url);
    playFrom(
      playableTracks.map((t) => toPlayerTrack(t, null, locale)),
      playableTracks.findIndex((t) => t.track_id === track.track_id)
    );
  };

  return (
    <li className={styles.track} style={paletteVars(palette)}>
      <div className={styles.header}>
        <div className={styles.cover}>
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
        </div>

        <div className={styles.heading}>
          <Link
            href={`/tracks/${track.track_id}`}
            className={`${styles.name} ${active ? "shimmer" : ""}`}
          >
            {track.track_name}
          </Link>
          {track.album_name && (
            <span className={styles.album}>{track.album_name}</span>
          )}
        </div>
      </div>

      {description && <p className={styles.description}>{description}</p>}

      {/* controls row: play on the left, duration and like on the right */}
      <div className={styles.controls}>
        <button
          type="button"
          className={`${styles.play} ${active ? styles.playing : ""}`}
          disabled={!playable}
          aria-label={
            active ? `Pause ${track.track_name}` : `Play ${track.track_name}`
          }
          onClick={onPlayClick}
        >
          {active ? (
            <Pause size={20} strokeWidth={2} />
          ) : (
            <Play size={20} strokeWidth={2} />
          )}
        </button>

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
    </li>
  );
}
