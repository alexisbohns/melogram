import Image from "next/image";
import type { CSSProperties } from "react";
import type { RenderImage } from "vinyl-kit";

/**
 * Melogram's bridge to vinyl-kit.
 *
 * The package is framework-agnostic — it renders plain `<img>` unless a host
 * supplies its own renderer — so this is where the app plugs in `next/image`
 * (optimised covers, responsive `sizes`) and maps the app's album palette onto
 * the package's colour properties.
 */

/** The record mask and sleeve texture, served as static files rather than the
    package's inlined data URIs, to keep them out of the JS bundle. */
export const VINYL_MASK_URL = "/vinyl-mask.webp";
export const VINYL_TEXTURE_URL = "/cover-texture.png";

/** `next/image` as a vinyl-kit renderer. `fill` + the layer's CSS do the sizing. */
export function nextVinylImage(priority?: boolean): RenderImage {
  return function VinylImage({ src, alt, sizePx }) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizePx ? `${sizePx}px` : undefined}
        priority={priority}
      />
    );
  };
}

/**
 * Point vinyl-kit's colour properties at the album palette already in scope, so
 * a record picks up its album's theme with no per-call colour plumbing.
 */
export const albumVinylVars = {
  "--vinyl-tint": "var(--album-accent)",
  "--vinyl-backdrop":
    "linear-gradient(135deg, var(--album-deep), color-mix(in srgb, var(--album-accent) 40%, var(--bg)))",
} as CSSProperties;
