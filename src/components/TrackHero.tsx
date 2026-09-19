"use client";

import Link from "next/link";
import { Disc3 } from "lucide-react";
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
 * The track page's header — the album hero's shape exactly (see
 * AlbumDetailCard): the cover with its vinyl on the left, then a body column
 * of name, subtitle, description, actions. On desktop the hero dissolves into
 * the page grid the same way the album card's does, so the cover heads the
 * same column the sidebar runs down (see TrackHero.module.css).
 *
 * Where the album hero opens with the album's name, the track's opens with a
 * pill carrying it, linking back to the album. Play lives in `SongVisualizer`
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
      {/* Always rendered, album or not: the cover is this column's first cell
          on desktop, and a solo track still gets the empty sleeve rather than
          a hole where the grid expects one. `subject` extracts the vinyl the
          way the album page's hero does — this cover headlines its page just
          as much, and the pathname alone can't tell AlbumCoverLive that. */}
      <div className={styles.cover}>
        <AlbumCoverLive
          albumId={track.album_id}
          coverUrl={track.album_cover_url}
          alt={track.album_name ?? ""}
          size={165}
          priority
          reserve
          subject
        />
      </div>

      <div className={styles.heroBody}>
        <div className={styles.header}>
          {track.album_id && track.album_name && (
            <Link
              href={`/albums/${track.album_id}`}
              className={styles.albumPill}
            >
              <Disc3 size={14} strokeWidth={2} aria-hidden="true" />
              <span className={styles.albumPillName}>{track.album_name}</span>
            </Link>
          )}

          <h1 className={`${styles.name} ${active ? "shimmer" : ""}`}>
            {track.track_name}
          </h1>

          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>

        {description && <p className={styles.description}>{description}</p>}

        <TrackActions track={track} lyrics={lyrics} />
      </div>
    </header>
  );
}
