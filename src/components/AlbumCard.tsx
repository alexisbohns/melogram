import Link from "next/link";
import type { AlbumWithTracks } from "@/lib/types";
import { getPalette, paletteVars } from "@/lib/palettes";
import AlbumCoverLive from "./AlbumCoverLive";
import AlbumHeader from "./AlbumHeader";
import AlbumMetaTiles from "./AlbumMetaTiles";
import AlbumPlaylist from "./AlbumPlaylist";
import styles from "./AlbumCard.module.css";

/** Home page album card (Figma "AlbumCard" on Home frames). */
export default function AlbumCard({ album }: { album: AlbumWithTracks }) {
  const palette = getPalette(album);

  return (
    <article className={styles.card} style={paletteVars(palette)}>
      <Link href={`/albums/${album.id}`} aria-label={album.name}>
        <AlbumCoverLive
          albumId={album.id}
          coverUrl={album.cover_url}
          alt={album.name}
          size={160}
        />
      </Link>
      <AlbumHeader album={album} align="center" linked />
      <AlbumMetaTiles
        genre={palette.genre ?? capitalize(album.type)}
        year={new Date(album.created_at).getFullYear().toString()}
        direction="vertical"
      />
      {album.description && (
        <p className={styles.description}>{album.description}</p>
      )}
      <AlbumPlaylist tracks={album.tracks} variant="simple" />
    </article>
  );
}

function capitalize(value: string | null): string {
  if (!value) return "Album";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
