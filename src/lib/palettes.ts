import type { CSSProperties } from "react";

/**
 * Resolved album colors — the CSS custom properties every album-scoped
 * component reads. Produced from a theme (below); not stored directly.
 */
export type AlbumPalette = {
  /** Text on album content (names, descriptions). */
  light: string;
  /** Accent: infos, icons, idle play/like buttons. */
  accent: string;
  /** Deep shade: times, meta tile icons. */
  deep: string;
  /**
   * Display genre for the meta tile. Album-specific, NOT part of the theme —
   * a temporary override kept from the pre-theme palette map until real album
   * genres flow through every view (the list view doesn't load them yet).
   */
  genre?: string;
};

/** A named, selectable color theme — one option in the edit-mode picker. */
export type AlbumTheme = {
  /** Stable key persisted in `albums.theme` and selected in the picker. */
  key: string;
  /** Human-readable label shown in the picker. */
  name: string;
  /** The three colors this theme paints. */
  palette: { light: string; accent: string; deep: string };
};

/**
 * Sentinel stored in `albums.theme` when the palette should be derived from
 * the cover art. The nearest-theme match is computed client-side (added in a
 * later step); until then such albums fall back to the legacy map / default.
 */
export const AUTO_THEME = "auto";

/**
 * The theme catalog — the single source of truth for album colors. Add a
 * theme here and the picker lists it automatically. More themes to come.
 */
export const THEMES: AlbumTheme[] = [
  {
    key: "amber",
    name: "Amber",
    palette: { light: "#F6EFE6", accent: "#A15C08", deep: "#714006" },
  },
  {
    key: "violet",
    name: "Violet",
    palette: { light: "#F2EFF5", accent: "#7B5E99", deep: "#56426B" },
  },
  {
    key: "slate",
    name: "Slate",
    palette: { light: "#EEF0F3", accent: "#59658A", deep: "#3E4761" },
  },
  {
    key: "brick",
    name: "Brick",
    palette: { light: "#F4ECEC", accent: "#8E4242", deep: "#632E2E" },
  },
  {
    key: "iron",
    name: "Iron",
    palette: { light: "#F3F3F3", accent: "#868686", deep: "#5E5E5E" },
  },
  {
    key: "amethyst",
    name: "Amethyst",
    palette: { light: "#F6EDF3", accent: "#A9478A", deep: "#763261" },
  },
  {
    key: "forest",
    name: "Forest",
    palette: { light: "#EDF2EE", accent: "#487C5A", deep: "#32573F" },
  },
  {
    key: "linen",
    name: "Linen",
    palette: { light: "#E9E2E4", accent: "#7A5E64", deep: "#4A3639" },
  }
];

const THEME_BY_KEY: Record<string, AlbumTheme> = Object.fromEntries(
  THEMES.map((theme) => [theme.key, theme])
);

/** Ultimate fallback when an album has no theme and no legacy match. */
const FALLBACK = THEME_BY_KEY.violet.palette;

/**
 * Legacy album-name → theme key, so albums whose stored theme is still 'auto'
 * keep rendering their original hand-picked palette until cover-based
 * detection lands. Also serves callers that only know an album's id/name (e.g.
 * the player bar) and not its stored theme.
 */
const LEGACY_THEME: Record<string, string> = {
  "Dawn from the Semicolon": "amber",
  Bones: "violet",
  Celesta: "slate",
};

/** Album-specific display genre — see AlbumPalette.genre. */
const LEGACY_GENRE: Record<string, string> = {
  "Dawn from the Semicolon": "Folk",
  Bones: "Folk",
  Celesta: "Cinematic",
};

type AlbumLike = { id?: string; name?: string | null; theme?: string | null };

/** Resolve an album's palette: its stored theme, else the legacy match, else
    the default. `theme` may be absent when the caller only has id/name. */
export function getPalette(album: AlbumLike): AlbumPalette {
  const key =
    album.theme && album.theme !== AUTO_THEME
      ? album.theme
      : LEGACY_THEME[album.name ?? ""];
  const base = (key ? THEME_BY_KEY[key]?.palette : undefined) ?? FALLBACK;
  const genre = LEGACY_GENRE[album.name ?? ""];
  return genre ? { ...base, genre } : { ...base };
}

/** Inline CSS custom properties consumed by every album-scoped component. */
export function paletteVars(palette: AlbumPalette): CSSProperties {
  return {
    "--album-light": palette.light,
    "--album-accent": palette.accent,
    "--album-deep": palette.deep,
  } as CSSProperties;
}
