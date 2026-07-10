import type { CSSProperties } from "react";

export type AlbumPalette = {
  /** Text on album content (names, descriptions). */
  light: string;
  /** Accent: infos, icons, idle play/like buttons. */
  accent: string;
  /** Deep shade: times, meta tile icons. */
  deep: string;
  /** Display genre for the meta tile (not stored in Supabase yet). */
  genre?: string;
};

const FALLBACK: AlbumPalette = {
  light: "#F2EFF5",
  accent: "#7B5E99",
  deep: "#56426B",
};

/**
 * Hardcoded per-album themes (step 1 — no Supabase model change).
 * Keyed by album name; an id key takes precedence when present.
 */
const PALETTES: Record<string, AlbumPalette> = {
  "Dawn from the Semicolon": {
    light: "#F6EFE6",
    accent: "#A15C08",
    deep: "#714006",
    genre: "Folk",
  },
  Bones: {
    light: "#F2EFF5",
    accent: "#7B5E99",
    deep: "#56426B",
    genre: "Folk",
  },
  Celesta: {
    light: "#EEF0F3",
    accent: "#59658A",
    deep: "#3E4761",
    genre: "Cinematic",
  },
};

export function getPalette(album: { id: string; name: string }): AlbumPalette {
  return PALETTES[album.id] ?? PALETTES[album.name] ?? FALLBACK;
}

/** Inline CSS custom properties consumed by every album-scoped component. */
export function paletteVars(palette: AlbumPalette): CSSProperties {
  return {
    "--album-light": palette.light,
    "--album-accent": palette.accent,
    "--album-deep": palette.deep,
  } as CSSProperties;
}
