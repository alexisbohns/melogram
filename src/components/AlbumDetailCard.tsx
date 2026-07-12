"use client";

import type { AlbumWithTracks, TrackLyrics } from "@/lib/types";
import { getPalette, paletteVars } from "@/lib/palettes";
import AlbumCover from "./AlbumCover";
import AlbumHeader from "./AlbumHeader";
import AlbumInfos from "./AlbumInfos";
import AlbumMetaTiles from "./AlbumMetaTiles";
import AlbumPlaylist from "./AlbumPlaylist";
import EditToggle from "./edit/EditToggle";
import EditableText from "./edit/EditableText";
import AlbumTypeSelect from "./edit/AlbumTypeSelect";
import GenrePicker from "./edit/GenrePicker";
import { useAlbumEdit } from "./edit/AlbumEditProvider";
import styles from "./AlbumDetailCard.module.css";

type Props = {
  album: AlbumWithTracks;
  lyrics: TrackLyrics;
};

/** Album page main card (Figma "AlbumCard" on Album frames). */
export default function AlbumDetailCard({ album, lyrics }: Props) {
  const { editing, draft, setField } = useAlbumEdit();
  const palette = getPalette(album);

  return (
    <article className={styles.card} style={paletteVars(palette)}>
      <div className={styles.editBar}>
        <EditToggle />
      </div>
      <div className={styles.hero}>
        <AlbumCover
          coverUrl={album.cover_url}
          alt={album.name}
          size={165}
          priority
        />
        <div className={styles.heroBody}>
          {editing ? (
            <div className={styles.header}>
              <EditableText
                ariaLabel="Album name"
                value={draft.name}
                onCommit={(v) => setField("name", v)}
                className={styles.nameEdit}
              />
              <AlbumInfos tracks={album.tracks} />
            </div>
          ) : (
            <AlbumHeader album={album} />
          )}

          {editing ? (
            <EditableText
              ariaLabel="Album description"
              multiline
              value={draft.description}
              placeholder="Add a description…"
              onCommit={(v) => setField("description", v)}
              className={styles.description}
            />
          ) : (
            album.description && (
              <p className={styles.description}>{album.description}</p>
            )
          )}

          {editing ? (
            <>
              <AlbumTypeSelect
                value={draft.type}
                onChange={(v) => setField("type", v)}
              />
              <GenrePicker
                selected={draft.genres}
                onChange={(g) => setField("genres", g)}
              />
            </>
          ) : (
            <AlbumMetaTiles
              genre={palette.genre ?? capitalize(album.type)}
              year={new Date(album.created_at).getFullYear().toString()}
              direction="horizontal"
            />
          )}
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
