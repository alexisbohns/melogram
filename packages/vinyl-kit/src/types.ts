import type { ReactNode } from "react";

/**
 * What vinyl-kit asks of an image renderer. The package never imports a
 * framework image component — it hands these props to `renderImage` so the host
 * app can plug in whatever it uses (`next/image`, a CDN loader, a plain `<img>`).
 */
export type VinylImageProps = {
  src: string;
  alt: string;
  /**
   * Intended rendered size in px — a hint for responsive loaders (e.g.
   * `next/image`'s `sizes`). Absent when the caller doesn't know its own
   * rendered size (a disc sized by its parent rather than by the `size` prop).
   */
  sizePx?: number;
};

/** Renders one image inside a vinyl layer. Must fill its positioned parent. */
export type RenderImage = (props: VinylImageProps) => ReactNode;
