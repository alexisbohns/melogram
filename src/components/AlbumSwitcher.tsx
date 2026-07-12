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
  // The active album already headlines the main card, so skip it here to avoid
  // showing its cover twice.
  const others = albums.filter((album) => album.id !== activeId);

  return (
    <nav className={styles.switcher} aria-label="Albums">
      {others.map((album) => (
        <Link
          key={album.id}
          href={`/albums/${album.id}`}
          className={styles.item}
          style={paletteVars(getPalette(album))}
        >
          <AlbumCoverLive
            albumId={album.id}
            coverUrl={album.cover_url}
            alt=""
            size={67}
          />
          <span className={styles.text}>
            <span className={styles.name}>{album.name}</span>
            <AlbumInfos tracks={album.tracks} />
          </span>
        </Link>
      ))}
    </nav>
  );
}
