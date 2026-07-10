import type { AlbumWithTracks, TrackLyrics } from "@/lib/types";
import { getPalette, paletteVars } from "@/lib/palettes";
import AlbumCover from "./AlbumCover";
import AlbumHeader from "./AlbumHeader";
import AlbumMetaTiles from "./AlbumMetaTiles";
import AlbumPlaylist from "./AlbumPlaylist";
import styles from "./AlbumDetailCard.module.css";

type Props = {
  album: AlbumWithTracks;
  lyrics: TrackLyrics;
};

/** Album page main card (Figma "AlbumCard" on Album frames). */
export default function AlbumDetailCard({ album, lyrics }: Props) {
  const palette = getPalette(album);

  return (
    <article className={styles.card} style={paletteVars(palette)}>
      <div className={styles.hero}>
        <AlbumCover
          coverUrl={album.cover_url}
          alt={album.name}
          size={165}
          priority
        />
        <div className={styles.heroBody}>
          <AlbumHeader album={album} />
          {album.description && (
            <p className={styles.description}>{album.description}</p>
          )}
          <AlbumMetaTiles
            genre={palette.genre ?? capitalize(album.type)}
            year={new Date(album.created_at).getFullYear().toString()}
            direction="horizontal"
          />
        </div>
      </div>
      <AlbumPlaylist tracks={album.tracks} variant="detailed" lyrics={lyrics} />
    </article>
  );
}

function capitalize(value: string | null): string {
  if (!value) return "Album";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
