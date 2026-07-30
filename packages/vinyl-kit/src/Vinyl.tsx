import type { CSSProperties } from "react";
import { defaultMask } from "./assets";
import { defaultRenderImage } from "./image";
import type { RenderImage } from "./types";

export type VinylProps = {
  /** Artwork for the disc's centre label. Omit for a plain tinted record. */
  cover?: string | null;
  /** The record's colour — sets `--vinyl-tint`. */
  tint?: string;
  /** Rendered diameter in px. Omit to fill the parent's width (or use `fill`). */
  size?: number;
  /** Fill a positioned parent instead of sizing the disc itself. */
  fill?: boolean;
  /**
   * Turn the record. `true` spins, `false` freezes it mid-revolution (the
   * needle lifts, the disc stops where it stopped), and omitting the prop
   * altogether attaches no animation at all.
   */
  spinning?: boolean;
  /** Override the bundled groove mask (e.g. point at your own static file). */
  maskUrl?: string;
  /** Alt text for the centre label. Defaults to "" — the disc is decorative. */
  alt?: string;
  renderImage?: RenderImage;
  className?: string;
  style?: CSSProperties;
};

/**
 * A vinyl record: three layers stacked inside a circular, blend-isolated frame.
 *
 *   1. a solid fill in the record's tint,
 *   2. the cover art, centred in a small circle (the label),
 *   3. the groove mask, blended with `mix-blend-mode: luminosity` — so the
 *      grooves take their hue from the tint below while the mask's transparent
 *      centre lets the label show through.
 *
 * One grayscale mask therefore paints a record in any colour, and every album
 * gets a record showing its own art.
 */
export default function Vinyl({
  cover,
  tint,
  size,
  fill = false,
  spinning,
  maskUrl,
  alt = "",
  renderImage = defaultRenderImage,
  className,
  style,
}: VinylProps) {
  const vars: CSSProperties = {
    ...(tint ? ({ "--vinyl-tint": tint } as CSSProperties) : null),
    ...(size !== undefined
      ? ({
          "--vinyl-size": `${size}px`,
          width: `${size}px`,
          height: `${size}px`,
        } as CSSProperties)
      : null),
    ...style,
  };

  return (
    <div
      className={["vk-disc", fill ? "vk-disc--fill" : "", className]
        .filter(Boolean)
        .join(" ")}
      data-spinning={spinning === undefined ? undefined : String(spinning)}
      style={vars}
    >
      <div className="vk-disc-color" />
      {cover && (
        <div className="vk-disc-label">
          {renderImage({
            src: cover,
            alt,
            sizePx: size === undefined ? undefined : Math.round(size * 0.38),
          })}
        </div>
      )}
      <div className="vk-disc-mask" aria-hidden="true">
        {renderImage({ src: maskUrl ?? defaultMask, alt: "", sizePx: size })}
      </div>
    </div>
  );
}
