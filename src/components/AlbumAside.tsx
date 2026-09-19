"use client";

import { useEffect, useMemo, useState } from "react";
import { hasVersion, type AlbumWithTracks } from "@/lib/types";
import { getMyArtistIds } from "@/lib/edit";
import { useMessages } from "@/lib/i18n/LocaleProvider";
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
 * The track page's left column: the rest of the album the track belongs to,
 * without its cover (the hero already shows the vinyl) and without its name
 * (the hero's pill carries it, and links back). Mirrors `AlbumSwitcher`'s
 * column idiom, wrapped in its own `PaletteScope` the same way that switcher
 * scopes each of its items.
 *
 * Versionless tracks are hidden from listeners here exactly as they are
 * everywhere else — a track is public once it carries a version — while a
 * member of the album's artist still sees them, matching the album page's
 * read mode. The membership check is why this is a client component; until it
 * resolves the listener view is what renders, so a visitor never glimpses a
 * track that isn't out yet.
 */
export default function AlbumAside({ album, currentTrackId }: Props) {
  const m = useMessages();
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    let active = true;
    getMyArtistIds()
      .then((ids) => {
        if (active) setIsMember(album.artist_id ? ids.has(album.artist_id) : false);
      })
      .catch(() => {
        if (active) setIsMember(false);
      });
    return () => {
      active = false;
    };
  }, [album.artist_id]);

  const versioned = useMemo(() => album.tracks.filter(hasVersion), [album.tracks]);
  const tracks = isMember ? album.tracks : versioned;

  return (
    <PaletteScope album={{ ...album, coverUrl: album.cover_url }}>
      <aside className={styles.aside}>
        <h2 className={styles.title}>{m.sections.albumTracks}</h2>
        <AlbumInfos tracks={tracks} />
        <AlbumPlaylist
          tracks={tracks}
          variant="nav"
          currentTrackId={currentTrackId}
        />
      </aside>
    </PaletteScope>
  );
}
