import Link from "next/link";
import type { AlbumWithTracks } from "@/lib/types";
import PaletteScope from "./PaletteScope";
import AlbumInfos from "./AlbumInfos";
import AlbumPlaylist from "./AlbumPlaylist";
import styles from "./AlbumAside.module.css";

type Props = {
  album: AlbumWithTracks;
  /** The track whose page we're on — marks its row in the playlist below. */
  currentTrackId: string;
};

/**
 * The track page's left column: the album the track belongs to, without its
 * cover (the hero already shows the vinyl). Mirrors `AlbumSwitcher`'s column
 * idiom, wrapped in its own `PaletteScope` the same way that switcher scopes
 * each of its items.
 */
export default function AlbumAside({ album, currentTrackId }: Props) {
  return (
    <PaletteScope album={{ ...album, coverUrl: album.cover_url }}>
      <aside className={styles.aside}>
        <h2 className={styles.name}>
          <Link href={`/albums/${album.id}`}>{album.name}</Link>
        </h2>
        <AlbumInfos tracks={album.tracks} />
        <AlbumPlaylist
          tracks={album.tracks}
          variant="simple"
          currentTrackId={currentTrackId}
        />
      </aside>
    </PaletteScope>
  );
}
