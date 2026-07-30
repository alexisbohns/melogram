import type { RenderImage } from "./types";

/**
 * The default image renderer: a plain `<img>`. vinyl.css gives every image
 * inside a vinyl layer `position: absolute; inset: 0; object-fit: cover`, so
 * this fills its layer without needing inline styles — and stays compatible
 * with framework components (like `next/image` with `fill`) that set those
 * same properties inline themselves.
 */
export const defaultRenderImage: RenderImage = ({ src, alt }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt={alt} draggable={false} />
);
