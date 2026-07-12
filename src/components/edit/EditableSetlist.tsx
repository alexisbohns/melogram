"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, X, Plus } from "lucide-react";
import { useAlbumEdit } from "./AlbumEditProvider";
import styles from "./EditableSetlist.module.css";

export default function EditableSetlist() {
  const { setlist, moveItem, removeItem, addItem } = useAlbumEdit();
  const [name, setName] = useState("");

  return (
    <div className={styles.list}>
      {setlist.map((item, i) => (
        <div key={item.key} className={styles.row}>
          <span className={styles.num}>{i + 1}</span>
          <span className={styles.name}>
            {item.name}
            {!item.trackId && <em className={styles.pending}> · new</em>}
          </span>
          <div className={styles.controls}>
            <button
              type="button"
              aria-label="Move up"
              disabled={i === 0}
              onClick={() => moveItem(i, -1)}
            >
              <ArrowUp size={16} />
            </button>
            <button
              type="button"
              aria-label="Move down"
              disabled={i === setlist.length - 1}
              onClick={() => moveItem(i, 1)}
            >
              <ArrowDown size={16} />
            </button>
            <button
              type="button"
              aria-label="Remove"
              className={styles.remove}
              onClick={() => removeItem(item.key)}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
      <form
        className={styles.add}
        onSubmit={(e) => {
          e.preventDefault();
          addItem(name);
          setName("");
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New track name…"
          aria-label="New track name"
        />
        <button type="submit" disabled={!name.trim()}>
          <Plus size={16} /> Add
        </button>
      </form>
      <p className={styles.hint}>
        Order &amp; track changes apply when you Save. Add audio to a track after
        saving.
      </p>
    </div>
  );
}
