"use client";

import { useState } from "react";
import Link from "next/link";
import { Mic } from "lucide-react";
import { toPlayerTrack, usePlayer } from "@/player/PlayerProvider";
import { formatTime } from "@/player/durations";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { localized } from "@/lib/i18n/config";
import type { Track, TrackLyrics } from "@/lib/types";
import IconButton from "./IconButton";
import LikeButton from "./LikeButton";
import LyricsSheet from "./LyricsSheet";
import PlayButton from "./PlayButton";
import styles from "./AlbumTrack.module.css";

type Props = {
  track: Track;
  /** All tracks of the surrounding playlist — queued together on play. */
  queue: Track[];
  variant?: "simple" | "detailed" | "nav";
  lyrics?: string | null;
  /**
   * Lyrics keyed by track id for the whole `queue`, so each queued entry
   * carries its lyrics into the global player's expanded view.
   */
  queueLyrics?: TrackLyrics;
  /** This row is the track whose page we're on. Distinct from `active`, which
      means playing — both can be true at once. */
  current?: boolean;
};

export default function AlbumTrack({
  track,
  queue,
  variant = "simple",
  lyrics = null,
  queueLyrics,
  current: isCurrent = false,
}: Props) {
  const { current, isPlaying, toggle, playFrom } = usePlayer();
  const locale = useLocale();
  const duration = track.duration;
  const [lyricsOpen, setLyricsOpen] = useState(false);

  const playable = Boolean(track.latest_resource_url);
  const active = current?.id === track.track_id && isPlaying;
  const detailed = variant === "detailed";
  const rowClass = `${styles.track} ${detailed ? styles.detailed : ""} ${isCurrent ? styles.current : ""}`;
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

  // The track page's sidebar: a list to move around the album by, not a
  // second transport. The whole row is the link, and it carries no control —
  // play lives in the page's own visualizer, and liking a track is something
  // you do on the track itself.
  if (variant === "nav") {
    return (
      <li
        className={`${rowClass} ${styles.navTrack}`}
        aria-current={isCurrent ? "true" : undefined}
      >
        <Link href={`/tracks/${track.track_id}`} className={styles.navRow}>
          <span className={`${styles.name} ${active ? "shimmer" : ""}`}>
            {track.track_name}
          </span>
          <span className={styles.time}>
            {duration !== null ? formatTime(duration) : "–:–"}
          </span>
        </Link>
      </li>
    );
  }

  return (
    <li className={rowClass} aria-current={isCurrent ? "true" : undefined}>
      <PlayButton
        playing={active}
        disabled={!playable}
        label={active ? `Pause ${track.track_name}` : `Play ${track.track_name}`}
        onClick={onPlayClick}
      />

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
          <IconButton
            label={`Lyrics of ${track.track_name}`}
            onClick={() => setLyricsOpen(true)}
          >
            <Mic size={20} strokeWidth={2} />
          </IconButton>
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
