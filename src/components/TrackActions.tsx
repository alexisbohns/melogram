"use client";

import { Mic } from "lucide-react";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import type { Track } from "@/lib/types";
import LikeButton from "./LikeButton";
import { LYRICS_ANCHOR } from "./TrackLyrics";
import styles from "./TrackActions.module.css";

type Props = {
  track: Track;
  lyrics: string | null;
};

/**
 * The track hero's actions: like and lyrics, sitting under the description.
 *
 * These were tiles, borrowing `AlbumMetaTiles`' treatment so the track header
 * would match the album header. They can't be: a tile is `padding: 16px`
 * around a 24px icon, 56px tall, while `LikeButton` is a fixed 40px control
 * with its own padding — inside a tile that's 72px, and the row stretches the
 * other tile to match. Restyling the shared LikeButton to fit would be the
 * tail wagging the dog, so the actions are a plain row instead, each button
 * carrying LikeButton's geometry.
 *
 * Lyrics are a section further down this page (`TrackLyrics`), not a sheet, so
 * the button is a plain in-page link that scrolls to it — and only renders
 * when the track has words to scroll to.
 */
export default function TrackActions({ track, lyrics }: Props) {
  const m = useMessages();

  const onLyricsClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const section = document.getElementById(LYRICS_ANCHOR);
    if (!section) return; // let the browser follow the hash
    event.preventDefault();
    section.scrollIntoView({ behavior: "smooth", block: "start" });
    // The hash still belongs in the URL — the section is a linkable place —
    // but writing it with the History API avoids the instant jump `href`
    // navigation would do on top of the smooth scroll.
    history.replaceState(null, "", `#${LYRICS_ANCHOR}`);
  };

  return (
    <div className={styles.actions}>
      <LikeButton
        trackId={track.track_id}
        likeCount={track.like_count ?? 0}
        showCount
      />

      {lyrics && (
        <a
          href={`#${LYRICS_ANCHOR}`}
          className={styles.lyrics}
          onClick={onLyricsClick}
        >
          <Mic size={20} strokeWidth={2} />
          {m.player.lyrics}
        </a>
      )}
    </div>
  );
}
