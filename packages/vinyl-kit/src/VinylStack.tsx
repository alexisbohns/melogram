import type { CSSProperties } from "react";
import Vinyl from "./Vinyl";
import { defaultRenderImage } from "./image";
import type { RenderImage } from "./types";

export type VinylStackItem = {
  cover?: string | null;
  tint?: string;
  alt?: string;
};

export type VinylStackProps = {
  /** The records, front first: item 0 sits on top and anchors the stack. */
  items: VinylStackItem[];
  /**
   * Disc diameter in px. Omit to inherit `--vinyl-size` from an ancestor —
   * the stack has no intrinsic size of its own.
   */
  size?: number;
  /** Spin the front record (see `Vinyl`'s `spinning`). */
  spinning?: boolean;
  maskUrl?: string;
  renderImage?: RenderImage;
  className?: string;
  style?: CSSProperties;
};

/**
 * A crate of records fanned out to the right, each one showing its own cover in
 * its centre. Hovering (or focusing anything inside) spreads the fan a little
 * wider — a transform-only move, so nothing around it shifts.
 */
export default function VinylStack({
  items,
  size,
  spinning,
  maskUrl,
  renderImage = defaultRenderImage,
  className,
  style,
}: VinylStackProps) {
  return (
    <div
      className={["vk-stack", className].filter(Boolean).join(" ")}
      style={
        {
          "--vk-count": items.length,
          ...(size !== undefined ? { "--vinyl-size": `${size}px` } : null),
          ...style,
        } as CSSProperties
      }
    >
      {items.map((item, index) => (
        <div
          key={index}
          className="vk-stack-item"
          style={{ "--vk-i": index, zIndex: items.length - index } as CSSProperties}
        >
          <Vinyl
            fill
            cover={item.cover}
            tint={item.tint}
            alt={item.alt ?? ""}
            spinning={index === 0 ? spinning : undefined}
            maskUrl={maskUrl}
            renderImage={renderImage}
          />
        </div>
      ))}
    </div>
  );
}
