"use client";

import { useState } from "react";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { localized, type Locale } from "@/lib/i18n/config";
import type { Album } from "@/lib/types";
import Prose from "./Prose";
import Section from "./Section";
import LocaleTabs from "./edit/LocaleTabs";
import { useAlbumEdit } from "./edit/AlbumEditProvider";
import controls from "./edit/controls.module.css";
import styles from "./AlbumStory.module.css";

/**
 * The album's liner notes, below the tracklist. Read mode renders the markdown
 * for the visitor's language; edit mode swaps in a plain textarea per language
 * (no WYSIWYG) whose value is staged on the album draft and saved with the
 * rest of the card.
 */
export default function AlbumStory({ album }: { album: Album }) {
  const { editing, draft, setField } = useAlbumEdit();
  const locale = useLocale();
  const m = useMessages();
  const [editLocale, setEditLocale] = useState<Locale>("en");

  if (editing) {
    const key = editLocale === "en" ? "story" : "story_fr";
    return (
      <Section
        title={m.sections.notes}
        action={<LocaleTabs value={editLocale} onChange={setEditLocale} />}
      >
        <textarea
          className={`${controls.textarea} ${styles.editor}`}
          value={draft[key]}
          placeholder="Liner notes — markdown welcome…"
          rows={10}
          aria-label={`Album notes (${editLocale.toUpperCase()})`}
          onChange={(e) => setField(key, e.target.value)}
        />
      </Section>
    );
  }

  const story = localized(album.story, album.story_fr, locale);
  if (!story) return null;

  return (
    <Section title={m.sections.notes}>
      <Prose markdown={story} />
    </Section>
  );
}
