/**
 * Track/album durations come from the server (`versions.duration_seconds`,
 * surfaced on each Track by the data layer). They used to be sniffed in the
 * browser by loading every track's audio metadata, which flooded the album and
 * home pages with media requests — infinite loading spinners, device heat,
 * hijacked audio sessions, and iOS WebContent OOM crashes. This module now only
 * formats a duration for display.
 */

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
