"use client";

import { useMessages } from "@/lib/i18n/LocaleProvider";
import Section from "./Section";
import styles from "./TrackLyrics.module.css";

/**
 * The track's lyrics, as a section of the page rather than a sheet — the
 * album page's rows still open `LyricsSheet`, but on a track's own page the
 * words belong in the page. The hero's lyrics button scrolls here (see
 * `TrackActions`), which is why the id is fixed rather than generated.
 */
export const LYRICS_ANCHOR = "lyrics";

export default function TrackLyrics({ lyrics }: { lyrics: string }) {
  const m = useMessages();
  return (
    <Section title={m.sections.lyrics} id={LYRICS_ANCHOR}>
      <div className={styles.lyrics}>{lyrics}</div>
    </Section>
  );
}
