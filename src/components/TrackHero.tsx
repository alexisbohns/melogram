"use client";

import { usePlayer } from "@/player/PlayerProvider";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { localized } from "@/lib/i18n/config";
import type { Track } from "@/lib/types";
import AlbumCoverLive from "./AlbumCoverLive";
import TrackActions from "./TrackActions";
import styles from "./TrackHero.module.css";

type Props = {
  track: Track;
  lyrics: string | null;
};

const STATUS_KEYS = ["draft", "demo", "prototype", "final"] as const;
type Status = (typeof STATUS_KEYS)[number];

function isStatus(value: string | null): value is Status {
  return !!value && (STATUS_KEYS as readonly string[]).includes(value);
}

/**
 * The track page's header — mirrors the album hero's shape (see
 * AlbumDetailCard): the album's cover (vinyl and all) beside a body column of
 * name, subtitle, description, and actions. Play lives in `SongVisualizer`
 * below this, not here — the header only says what the track IS.
 */
export default function TrackHero({ track, lyrics }: Props) {
  const { current, isPlaying } = usePlayer();
  const locale = useLocale();
  const m = useMessages();

  // Shimmer matches the treatment AlbumTrack/StandaloneTrack/PlayerBar give a
  // track's name while it's the one actually playing.
  const active = current?.id === track.track_id && isPlaying;
  const description = localized(
    track.track_description,
    track.track_description_fr,
    locale
  );

  const date = track.latest_release_date
    ? new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(track.latest_release_date))
    : null;
  const status = isStatus(track.latest_status)
    ? m.status[track.latest_status]
    : null;
  const subtitle = [date, status].filter(Boolean).join(" · ");

  return (
    <header className={styles.hero}>
      {track.album_id && (
        <AlbumCoverLive
          albumId={track.album_id}
          coverUrl={track.album_cover_url}
          alt={track.album_name ?? ""}
          size={165}
          priority
          reserve
        />
      )}

      <div className={styles.heroBody}>
        <h1 className={`${styles.name} ${active ? "shimmer" : ""}`}>
          {track.track_name}
        </h1>

        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}

        {description && <p className={styles.description}>{description}</p>}

        <TrackActions track={track} lyrics={lyrics} />
      </div>
    </header>
  );
}
