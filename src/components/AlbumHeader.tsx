import Link from "next/link";
import type { AlbumWithTracks } from "@/lib/types";
import AlbumInfos from "./AlbumInfos";
import styles from "./AlbumHeader.module.css";

type Props = {
  album: AlbumWithTracks;
  align?: "center" | "left";
  /** Link the album name to its page (used on home cards). */
  linked?: boolean;
};

export default function AlbumHeader({
  album,
  align = "left",
  linked = false,
}: Props) {
  const name = linked ? (
    <Link href={`/albums/${album.id}`}>{album.name}</Link>
  ) : (
    album.name
  );

  return (
    <div className={`${styles.header} ${align === "center" ? styles.center : ""}`}>
      <h2 className={styles.name}>{name}</h2>
      <AlbumInfos tracks={album.tracks} />
    </div>
  );
}
