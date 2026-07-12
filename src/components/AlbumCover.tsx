import Image from "next/image";
import type { CSSProperties } from "react";
import VinylDisc from "./VinylDisc";
import styles from "./AlbumCover.module.css";

type Props = {
  coverUrl: string | null;
  alt: string;
  /** Rendered size (px) of the square cover; the vinyl adds ~16% width. */
  size: number;
  priority?: boolean;
  /**
   * Active state (album playing or on its page): the cover tilts and the vinyl
   * slides out from behind it. Defaults to the tucked-in resting state.
   */
  active?: boolean;
  /**
   * Reserve layout width for the extracted vinyl. Use in contexts with content
   * to the right of the cover (album header, switcher) so it isn't overlapped.
   */
  reserve?: boolean;
};

export default function AlbumCover({
  coverUrl,
  alt,
  size,
  priority,
  active = false,
  reserve = false,
}: Props) {
  return (
    <div
      className={[
        styles.cover,
        active ? styles.active : "",
        reserve ? styles.reserve : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ "--size": `${size}px` } as CSSProperties}
    >
      <div className={styles.vinyl}>
        <VinylDisc coverUrl={coverUrl} size={size} />
      </div>
      <div className={styles.wrap}>
        {coverUrl && (
          <Image
            src={coverUrl}
            alt={alt}
            fill
            sizes={`${size}px`}
            priority={priority}
          />
        )}
        <div className={styles.texture} />
      </div>
    </div>
  );
}
