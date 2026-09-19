"use client";

import { useMemo, useState } from "react";
import { hasVersion, type AlbumWithTracks, type TrackLyrics } from "@/lib/types";
import { paletteVars } from "@/lib/palettes";
import { useAlbumPalette } from "@/lib/albumPalette";
import { displayGenre } from "@/lib/genres";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { localized, type Locale } from "@/lib/i18n/config";
import AlbumCoverLive from "./AlbumCoverLive";
import AlbumHeader from "./AlbumHeader";
import AlbumInfos from "./AlbumInfos";
import AlbumMetaTiles from "./AlbumMetaTiles";
import AlbumPlaylist from "./AlbumPlaylist";
import AlbumStory from "./AlbumStory";
import EditToggle from "./edit/EditToggle";
import EditableText from "./edit/EditableText";
import AlbumTypeSelect from "./edit/AlbumTypeSelect";
import GenrePicker from "./edit/GenrePicker";
import CoverUploader from "./edit/CoverUploader";
import EditableSetlist from "./edit/EditableSetlist";
import TrackDrawer from "./edit/TrackDrawer";
import LocaleTabs from "./edit/LocaleTabs";
import { useAlbumEdit } from "./edit/AlbumEditProvider";
import styles from "./AlbumDetailCard.module.css";

type Props = {
  album: AlbumWithTracks;
  lyrics: TrackLyrics;
};

/** Album page main card (Figma "AlbumCard" on Album frames). */
export default function AlbumDetailCard({ album, lyrics }: Props) {
  const { editing, canEdit, draft, setField } = useAlbumEdit();
  const locale = useLocale();
  const palette = useAlbumPalette({ ...album, coverUrl: album.cover_url });
  const description = localized(album.description, album.description_fr, locale);
  // Track drawer target: null = closed, { trackId: null } = create mode.
  // Mounted at card level (not inside the setlist) so a setlist resync or a
  // staged row removal can't unmount it mid-upload.
  const [drawer, setDrawer] = useState<{ trackId: string | null } | null>(null);
  const [descLocale, setDescLocale] = useState<Locale>("en");

  // Read mode shows the listener view (versioned tracks only); a signed-in
  // owner sees the full list, matching what they'd manage in edit mode.
  const versioned = useMemo(() => album.tracks.filter(hasVersion), [album.tracks]);
  const readTracks = canEdit ? album.tracks : versioned;
  const readAlbum = useMemo(
    () => ({ ...album, tracks: readTracks }),
    [album, readTracks]
  );

  // An album composed only of versionless tracks is hidden from listeners even
  // on a direct link (it never appears in any listing). Owners still reach it.
  if (versioned.length === 0 && !canEdit) {
    return (
      <article className={styles.notice} style={paletteVars(palette)}>
        <p className={styles.unavailable}>This album isn’t available yet.</p>
      </article>
    );
  }

  return (
    <article className={styles.card} style={paletteVars(palette)}>
      {/* Listeners get no bar at all — an empty one would still spend the
          card's 32px gap and push the hero down the page. */}
      {canEdit && (
        <div className={styles.editBar}>
          <EditToggle />
        </div>
      )}
      <div className={styles.hero}>
        <div className={styles.cover}>
          {editing ? (
            <CoverUploader
              albumId={album.id}
              coverUrl={album.cover_url}
              alt={album.name}
              size={165}
            />
          ) : (
            <AlbumCoverLive
              albumId={album.id}
              coverUrl={album.cover_url}
              alt={album.name}
              size={165}
              priority
              reserve
            />
          )}
        </div>
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
            <AlbumHeader album={readAlbum} />
          )}

          {editing ? (
            <div className={styles.descriptionEdit}>
              <LocaleTabs value={descLocale} onChange={setDescLocale} />
              <EditableText
                key={descLocale}
                ariaLabel={`Album description (${descLocale.toUpperCase()})`}
                multiline
                value={
                  descLocale === "en" ? draft.description : draft.description_fr
                }
                placeholder="Add a description…"
                onCommit={(v) =>
                  setField(
                    descLocale === "en" ? "description" : "description_fr",
                    v
                  )
                }
                className={styles.description}
              />
            </div>
          ) : (
            description && (
              <p className={styles.description}>{description}</p>
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
              genre={displayGenre(album)}
              year={new Date(album.created_at).getFullYear().toString()}
              direction="horizontal"
            />
          )}
        </div>
      </div>
      <div className={styles.body}>
        {editing ? (
          <EditableSetlist
            onEditTrack={(trackId) => setDrawer({ trackId })}
            onAddTrack={() => setDrawer({ trackId: null })}
          />
        ) : (
          <AlbumPlaylist
            tracks={readTracks}
            variant="detailed"
            lyrics={lyrics}
          />
        )}
        <AlbumStory album={album} />
      </div>
      {drawer && (
        <TrackDrawer
          key={drawer.trackId ?? "new"}
          trackId={drawer.trackId}
          onClose={() => setDrawer(null)}
        />
      )}
    </article>
  );
}
