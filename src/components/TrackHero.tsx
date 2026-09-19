"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Mic, Pause, Play } from "lucide-react";
import { toPlayerTrack, usePlayer } from "@/player/PlayerProvider";
import { formatTime } from "@/player/durations";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { localized } from "@/lib/i18n/config";
import type { Track } from "@/lib/types";
import LikeButton from "./LikeButton";
import LyricsSheet from "./LyricsSheet";
import styles from "./TrackHero.module.css";

type Props = {
  track: Track;
  lyrics: string | null;
};

/**
 * The track page's header: cover, name, album link, and the same three
 * actions a strip item carries — play, like, lyrics. The page's palette is
 * already in scope (PaletteScope), so nothing here resolves colors.
 */
export default function TrackHero({ track, lyrics }: Props) {
  const { current, isPlaying, toggle, playFrom } = usePlayer();
  const locale = useLocale();
  const m = useMessages();
  const [lyricsOpen, setLyricsOpen] = useState(false);

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
    playFrom([toPlayerTrack(track, lyrics, locale)], 0);
  };

  return (
    <header className={styles.hero}>
      <div className={styles.cover}>
        {track.album_cover_url && (
          <Image
            src={track.album_cover_url}
            alt=""
            fill
            sizes="200px"
            className={styles.coverImg}
            priority
          />
        )}
        <span className={styles.texture} />
      </div>

      <div className={styles.body}>
        <h1 className={`${styles.name} ${active ? "shimmer" : ""}`}>
          {track.track_name}
        </h1>

        {track.album_id && track.album_name && (
          <Link href={`/albums/${track.album_id}`} className={styles.album}>
            {track.album_name}
          </Link>
        )}

        {description && <p className={styles.description}>{description}</p>}

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
              <Pause size={24} strokeWidth={2} />
            ) : (
              <Play size={24} strokeWidth={2} />
            )}
          </button>

          <span className={styles.time}>
            {track.duration !== null ? formatTime(track.duration) : "–:–"}
          </span>

          <LikeButton
            trackId={track.track_id}
            likeCount={track.like_count ?? 0}
          />

          {lyrics && (
            <button
              type="button"
              className={styles.iconButton}
              aria-label={`Lyrics of ${track.track_name}`}
              onClick={() => setLyricsOpen(true)}
            >
              <Mic size={20} strokeWidth={2} aria-hidden />
              {m.player.lyrics}
            </button>
          )}
        </div>
      </div>

      {lyrics && (
        <LyricsSheet
          open={lyricsOpen}
          onClose={() => setLyricsOpen(false)}
          trackName={track.track_name}
          lyrics={lyrics}
        />
      )}
    </header>
  );
}
