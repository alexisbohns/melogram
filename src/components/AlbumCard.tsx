"use client";

import Link from "next/link";
import type { AlbumWithTracks } from "@/lib/types";
import { displayGenre } from "@/lib/genres";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { localized } from "@/lib/i18n/config";
import PaletteScope from "./PaletteScope";
import AlbumCoverLive from "./AlbumCoverLive";
import AlbumHeader from "./AlbumHeader";
import AlbumMetaTiles from "./AlbumMetaTiles";
import AlbumPlaylist from "./AlbumPlaylist";
import styles from "./AlbumCard.module.css";

/** Home page album card (Figma "AlbumCard" on Home frames). */
export default function AlbumCard({ album }: { album: AlbumWithTracks }) {
  const locale = useLocale();
  const description = localized(album.description, album.description_fr, locale);
  return (
    <PaletteScope album={{ ...album, coverUrl: album.cover_url }}>
      <article className={styles.card}>
        <Link
          href={`/albums/${album.id}`}
          aria-label={album.name}
          className={styles.coverLink}
        >
          <AlbumCoverLive
            albumId={album.id}
            coverUrl={album.cover_url}
            alt={album.name}
            size={160}
          />
        </Link>
        <AlbumHeader album={album} align="center" linked />
        <AlbumMetaTiles
          genre={displayGenre(album)}
          year={new Date(album.created_at).getFullYear().toString()}
          direction="vertical"
        />
        {description && <p className={styles.description}>{description}</p>}
        <AlbumPlaylist tracks={album.tracks} variant="simple" />
      </article>
    </PaletteScope>
  );
}
