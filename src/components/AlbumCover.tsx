import Image from "next/image";
import type { CSSProperties } from "react";
import styles from "./AlbumCover.module.css";

type Props = {
  coverUrl: string | null;
  alt: string;
  /** Rendered size (px) of the square cover; the vinyl adds ~16% width. */
  size: number;
  priority?: boolean;
};

export default function AlbumCover({ coverUrl, alt, size, priority }: Props) {
  return (
    <div
      className={styles.cover}
      style={{ "--size": `${size}px` } as CSSProperties}
    >
      <div className={styles.vinyl}>
        <Image src="/vinyl.png" alt="" fill sizes={`${size}px`} />
      </div>
      <div className={styles.wrap}>
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={alt}
            fill
            sizes={`${size}px`}
            priority={priority}
          />
        ) : (
          <div className={styles.placeholder} />
        )}
        <div className={styles.texture} />
      </div>
    </div>
  );
}
