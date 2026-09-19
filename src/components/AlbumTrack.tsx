"use client";

import { useState } from "react";
import Link from "next/link";
import { Mic, Pause, Play } from "lucide-react";
import { toPlayerTrack, usePlayer } from "@/player/PlayerProvider";
import { formatTime } from "@/player/durations";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { localized } from "@/lib/i18n/config";
import type { Track, TrackLyrics } from "@/lib/types";
import LikeButton from "./LikeButton";
import LyricsSheet from "./LyricsSheet";
import styles from "./AlbumTrack.module.css";

type Props = {
  track: Track;
  /** All tracks of the surrounding playlist — queued together on play. */
  queue: Track[];
  variant?: "simple" | "detailed";
  lyrics?: string | null;
  /**
   * Lyrics keyed by track id for the whole `queue`, so each queued entry
   * carries its lyrics into the global player's expanded view.
   */
  queueLyrics?: TrackLyrics;
};

export default function AlbumTrack({
  track,
  queue,
  variant = "simple",
  lyrics = null,
  queueLyrics,
}: Props) {
  const { current, isPlaying, toggle, playFrom } = usePlayer();
  const locale = useLocale();
  const duration = track.duration;
  const [lyricsOpen, setLyricsOpen] = useState(false);

  const playable = Boolean(track.latest_resource_url);
  const active = current?.id === track.track_id && isPlaying;
  const detailed = variant === "detailed";
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
      playableTracks.map((t) =>
        toPlayerTrack(t, queueLyrics?.[t.track_id] ?? null, locale)
      ),
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

      <Link
        href={`/tracks/${track.track_id}`}
        className={`${styles.name} ${active ? "shimmer" : ""}`}
      >
        {track.track_name}
      </Link>

      <div className={styles.footer}>
        <span className={styles.time}>
          {duration !== null ? formatTime(duration) : "–:–"}
        </span>
        <LikeButton trackId={track.track_id} likeCount={track.like_count ?? 0} />
        {detailed && lyrics && (
          <button
            type="button"
            className={styles.iconButton}
            aria-label={`Lyrics of ${track.track_name}`}
            onClick={() => setLyricsOpen(true)}
          >
            <Mic size={20} strokeWidth={2} />
          </button>
        )}
      </div>

      {detailed && description && (
        <p className={styles.description}>{description}</p>
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
