import Image from "next/image";
import styles from "./VinylDisc.module.css";

type Props = {
  /** Album cover shown in the disc's centre; null falls back to the color layer. */
  coverUrl: string | null;
  /** Rendered diameter (px) of the disc — sizes the centred cover's request. */
  size: number;
};

/**
 * The vinyl engine: a per-album record built from three stacked layers inside a
 * circular, blend-isolated frame —
 *   1. a solid fill in the album's primary theme colour (--album-accent),
 *   2. the album cover, centred in a circle (~38% of the disc),
 *   3. the vinyl mask (mix-blend-mode: luminosity), so its grooves paint the
 *      theme colour while the transparent centre lets the cover show through.
 *
 * The disc gives every album its own record showcasing its cover and colour.
 */
export default function VinylDisc({ coverUrl, size }: Props) {
  return (
    <div className={styles.disc}>
      <div className={styles.color} />
      {coverUrl && (
        <div className={styles.cover}>
          <Image
            src={coverUrl}
            alt=""
            fill
            sizes={`${Math.round(size * 0.38)}px`}
          />
        </div>
      )}
      <div className={styles.mask}>
        <Image src="/vinyl-mask.webp" alt="" fill sizes={`${size}px`} />
      </div>
    </div>
  );
}
