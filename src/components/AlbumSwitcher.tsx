import Link from "next/link";
import type { AlbumWithTracks } from "@/lib/types";
import { getPalette, paletteVars } from "@/lib/palettes";
import AlbumCoverLive from "./AlbumCoverLive";
import AlbumInfos from "./AlbumInfos";
import styles from "./AlbumSwitcher.module.css";

type Props = {
  albums: AlbumWithTracks[];
  activeId: string;
};

/** Album page navigation — vertical rail on desktop, horizontal strip on mobile. */
export default function AlbumSwitcher({ albums, activeId }: Props) {
  const sorted = [
    ...albums.filter((album) => album.id === activeId),
    ...albums.filter((album) => album.id !== activeId),
  ];

  return (
    <nav className={styles.switcher} aria-label="Albums">
      {sorted.map((album) => {
        const active = album.id === activeId;
        return (
          <Link
            key={album.id}
            href={`/albums/${album.id}`}
            className={`${styles.item} ${active ? styles.active : ""}`}
            aria-current={active ? "page" : undefined}
            style={paletteVars(getPalette(album))}
          >
            <AlbumCoverLive
              albumId={album.id}
              coverUrl={album.cover_url}
              alt=""
              size={67}
              reserve
            />
            <span className={styles.text}>
              <span className={styles.name}>{album.name}</span>
              <AlbumInfos tracks={album.tracks} />
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
