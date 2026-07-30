import type { CSSProperties } from "react";
import Vinyl from "./Vinyl";
import { defaultTexture } from "./assets";
import { defaultRenderImage } from "./image";
import type { RenderImage } from "./types";

export type VinylSleeveProps = {
  cover?: string | null;
  /** Alt text for the cover art — this one is meaningful, so name the album. */
  alt?: string;
  /** Rendered size in px of the square sleeve. All geometry derives from it. */
  size: number;
  /** Slide the record out of the sleeve and tilt the cover. */
  active?: boolean;
  /**
   * Reserve layout width for the fully extracted record. Use wherever content
   * sits to the right of the sleeve; without it the record simply overflows.
   */
  reserve?: boolean;
  /** Spin the record while it's out (see `Vinyl`'s `spinning`). */
  spinning?: boolean;
  tint?: string;
  maskUrl?: string;
  /** Override the bundled sleeve texture; `null` removes the texture layer. */
  textureUrl?: string | null;
  renderImage?: RenderImage;
  className?: string;
  style?: CSSProperties;
};

/**
 * An album sleeve with its record tucked inside: at rest the disc peeks past
 * the cover's right edge, and when `active` it rolls out as if pulled from the
 * sleeve while the cover tilts a couple of degrees.
 *
 * The choreography runs entirely on the inheritable `--vinyl-extract` custom
 * property (0 → 1), so a parent can drive it from CSS alone — no JavaScript
 * hover handlers:
 *
 *     .album-card:hover { --vinyl-extract: 1; }
 */
export default function VinylSleeve({
  cover,
  alt = "",
  size,
  active = false,
  reserve = false,
  spinning,
  tint,
  maskUrl,
  textureUrl,
  renderImage = defaultRenderImage,
  className,
  style,
}: VinylSleeveProps) {
  const texture = textureUrl === null ? null : textureUrl ?? defaultTexture;

  return (
    <div
      className={[
        "vk-sleeve",
        reserve ? "vk-sleeve--reserve" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-active={String(active)}
      style={
        {
          "--vinyl-size": `${size}px`,
          ...(tint ? { "--vinyl-tint": tint } : null),
          ...style,
        } as CSSProperties
      }
    >
      <div className="vk-sleeve-vinyl">
        <Vinyl
          fill
          cover={cover}
          spinning={spinning}
          maskUrl={maskUrl}
          renderImage={renderImage}
        />
      </div>
      <div className="vk-sleeve-cover">
        {cover && renderImage({ src: cover, alt, sizePx: size })}
        {texture && (
          <div
            className="vk-sleeve-texture"
            aria-hidden="true"
            style={{ backgroundImage: `url(${texture})` }}
          />
        )}
      </div>
    </div>
  );
}
