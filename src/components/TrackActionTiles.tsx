"use client";

import { useState } from "react";
import { Mic } from "lucide-react";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import type { Track } from "@/lib/types";
import LikeButton from "./LikeButton";
import LyricsSheet from "./LyricsSheet";
import styles from "./TrackActionTiles.module.css";

type Props = {
  track: Track;
  lyrics: string | null;
};

/**
 * The track hero's action row: like and lyrics, sharing `AlbumMetaTiles`'
 * visual treatment (tiles/module) but interactive. `LikeButton` already
 * renders its own like count (a hover tooltip), so it's placed in its tile
 * as-is rather than paired with a second, redundant count.
 *
 * The lyrics tile — and the sheet it opens — only render when the track has
 * lyrics, matching the hero's previous behaviour; the like tile then spans
 * the row alone (a plain consequence of `flex: 1 1 0` with one child).
 */
export default function TrackActionTiles({ track, lyrics }: Props) {
  const m = useMessages();
  const [lyricsOpen, setLyricsOpen] = useState(false);

  return (
    <>
      <div className={styles.tiles}>
        <div className={styles.tile}>
          <LikeButton
            trackId={track.track_id}
            likeCount={track.like_count ?? 0}
          />
        </div>

        {lyrics && (
          <button
            type="button"
            className={styles.tile}
            onClick={() => setLyricsOpen(true)}
          >
            <Mic size={24} strokeWidth={2} className={styles.icon} />
            <span className={styles.label}>{m.player.lyrics}</span>
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
