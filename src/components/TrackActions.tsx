"use client";

import { useState } from "react";
import { Mic } from "lucide-react";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import type { Track } from "@/lib/types";
import LikeButton from "./LikeButton";
import LyricsSheet from "./LyricsSheet";
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
 * The lyrics button — and the sheet it opens — only render when the track has
 * lyrics.
 */
export default function TrackActions({ track, lyrics }: Props) {
  const m = useMessages();
  const [lyricsOpen, setLyricsOpen] = useState(false);

  return (
    <>
      <div className={styles.actions}>
        <LikeButton
          trackId={track.track_id}
          likeCount={track.like_count ?? 0}
          showCount
        />

        {lyrics && (
          <button
            type="button"
            className={styles.lyrics}
            onClick={() => setLyricsOpen(true)}
          >
            <Mic size={20} strokeWidth={2} />
            {m.player.lyrics}
          </button>
        )}
      </div>

      {lyrics && (
        <LyricsSheet
          open={lyricsOpen}
          onClose={() => setLyricsOpen(false)}
          trackName={track.track_name}
          lyrics={lyrics}
        />
      )}
    </>
  );
}
