"use client";

import { Pencil, Check, X } from "lucide-react";
import { useAlbumEdit } from "./AlbumEditProvider";
import controls from "./controls.module.css";
import styles from "./EditToggle.module.css";

export default function EditToggle() {
  const { canEdit, editing, saving, saveError, startEditing, cancel, save } =
    useAlbumEdit();
  if (!canEdit) return null;

  if (!editing) {
    return (
      <button
        type="button"
        className={controls.btn}
        onClick={startEditing}
        aria-label="Edit album"
      >
        <Pencil size={18} strokeWidth={2} />
        <span>Edit</span>
      </button>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.actions}>
        <button
          type="button"
          className={controls.btn}
          onClick={cancel}
          disabled={saving}
        >
          <X size={18} strokeWidth={2} />
          <span>Cancel</span>
        </button>
        <button
          type="button"
          className={controls.btnPrimary}
          onClick={save}
          disabled={saving}
        >
          <Check size={18} strokeWidth={2} />
          <span>{saving ? "Saving…" : "Save"}</span>
        </button>
      </div>
      {saveError && (
        <p className={controls.error}>Save failed: {saveError}</p>
      )}
    </div>
  );
}
