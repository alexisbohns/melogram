"use client";

import { useCoverAccent } from "vinyl-kit";
import {
  getPalette,
  needsCoverAccent,
  nearestThemeKey,
  themePalette,
  type AlbumLike,
  type AlbumPalette,
} from "./palettes";

/** An album plus its cover, which is what colors can be derived from. */
export type AlbumColorSource = AlbumLike & { coverUrl?: string | null };

/**
 * An album's palette, dressed from its cover art when it has no theme of its
 * own: the cover's accent color is sampled in the browser and snapped to the
 * nearest catalog theme.
 *
 * The palette an album *does* have always wins, and until (or unless) sampling
 * succeeds this returns exactly what `getPalette` would — so colors only ever
 * refine after load, and a cover that can't be read changes nothing.
 */
export function useAlbumPalette(album: AlbumColorSource): AlbumPalette {
  const base = getPalette(album);
  const derivable = needsCoverAccent(album) ? album.coverUrl ?? null : null;
  const { accent, status } = useCoverAccent(derivable, {
    fallback: base.accent,
  });

  if (status !== "ready") return base;
  const derived = themePalette(nearestThemeKey(accent));
  if (!derived) return base;
  // Genre is album-specific, not part of the theme — carry it across.
  return base.genre ? { ...derived, genre: base.genre } : { ...derived };
}
