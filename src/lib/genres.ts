import type { AlbumWithTracks } from "./types";
import { getPalette } from "./palettes";

/**
 * Album genre helpers, shared by the album cards (meta tile) and the home
 * "Albums" filter tabs so both read the same value.
 */

function capitalize(value: string | null): string {
  if (!value) return "Album";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** The single genre shown on an album's meta tile (legacy palette genre → type). */
export function displayGenre(album: {
  id?: string;
  name?: string | null;
  theme?: string | null;
  type?: string | null;
}): string {
  return getPalette(album).genre ?? capitalize(album.type ?? null);
}

/**
 * Genres an album is filed under for the home filter tabs. Prefers the real
 * `album_genres` links; falls back to the single display genre so an album with
 * no links assigned still lands under a meaningful tab.
 */
export function albumFilterGenres(album: AlbumWithTracks): string[] {
  const linked = album.genres.map((g) => g.name);
  return linked.length > 0 ? linked : [displayGenre(album)];
}
