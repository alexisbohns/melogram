"use client";

import { Pencil, Check, X } from "lucide-react";
import { useAlbumEdit } from "./AlbumEditProvider";
import styles from "./EditToggle.module.css";

export default function EditToggle() {
  const { canEdit, editing, saving, startEditing, cancel, save } = useAlbumEdit();
  if (!canEdit) return null;

  if (!editing) {
    return (
      <button
        type="button"
        className={styles.edit}
        onClick={startEditing}
        aria-label="Edit album"
      >
        <Pencil size={16} strokeWidth={2} />
        <span>Edit</span>
      </button>
    );
  }

  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={styles.cancel}
        onClick={cancel}
        disabled={saving}
      >
        <X size={16} strokeWidth={2} />
        <span>Cancel</span>
      </button>
      <button
        type="button"
        className={styles.save}
        onClick={save}
        disabled={saving}
      >
        <Check size={16} strokeWidth={2} />
        <span>{saving ? "Saving…" : "Save"}</span>
      </button>
    </div>
  );
}
