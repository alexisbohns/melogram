"use client";

import type { CSSProperties, ReactNode } from "react";
import { paletteVars } from "@/lib/palettes";
import { useAlbumPalette, type AlbumColorSource } from "@/lib/albumPalette";

type Props = {
  album: AlbumColorSource;
  children: ReactNode;
  style?: CSSProperties;
};

/**
 * Puts an album's palette in scope for server-rendered subtrees, so they can
 * benefit from cover-derived colors (a client-side measurement) without
 * becoming client components themselves.
 *
 * The wrapper is `display: contents`: it generates no box at all, so layout is
 * exactly as if the children sat where it does, while the custom properties it
 * carries still inherit into them.
 */
export default function PaletteScope({ album, children, style }: Props) {
  const palette = useAlbumPalette(album);
  return (
    <div style={{ display: "contents", ...paletteVars(palette), ...style }}>
      {children}
    </div>
  );
}
