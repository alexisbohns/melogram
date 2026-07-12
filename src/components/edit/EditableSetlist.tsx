"use client";

import { useMemo } from "react";
import { ArrowUp, ArrowDown, X, Plus, Pencil } from "lucide-react";
import { useAlbumEdit } from "./AlbumEditProvider";
import controls from "./controls.module.css";
import styles from "./EditableSetlist.module.css";

type Props = {
  /** Open the track drawer on an existing track. */
  onEditTrack: (trackId: string) => void;
  /** Open the track drawer in create mode. */
  onAddTrack: () => void;
};

export default function EditableSetlist({ onEditTrack, onAddTrack }: Props) {
  const { setlist, moveItem, removeItem, album } = useAlbumEdit();

  const hasAudio = useMemo(
    () =>
      new Map(
        album.tracks.map((t) => [t.track_id, Boolean(t.latest_resource_url)])
      ),
    [album.tracks]
  );

  return (
    <div className={styles.list}>
      {setlist.map((item, i) => (
        <div key={item.trackId} className={styles.row}>
          <span className={styles.num}>{i + 1}</span>
          <button
            type="button"
            className={styles.nameButton}
            onClick={() => onEditTrack(item.trackId)}
          >
            <span className={styles.name}>{item.name}</span>
            {hasAudio.get(item.trackId) === false && (
              <span className={styles.noAudio}>No audio</span>
            )}
          </button>
          <div className={styles.controls}>
            <button
              type="button"
              className={controls.iconBtnSm}
              aria-label={`Move ${item.name} up`}
              disabled={i === 0}
              onClick={() => moveItem(i, -1)}
            >
              <ArrowUp size={18} strokeWidth={2} />
            </button>
            <button
              type="button"
              className={controls.iconBtnSm}
              aria-label={`Move ${item.name} down`}
              disabled={i === setlist.length - 1}
              onClick={() => moveItem(i, 1)}
            >
              <ArrowDown size={18} strokeWidth={2} />
            </button>
            <button
              type="button"
              className={controls.iconBtnSm}
              aria-label={`Edit ${item.name}`}
              onClick={() => onEditTrack(item.trackId)}
            >
              <Pencil size={18} strokeWidth={2} />
            </button>
            <button
              type="button"
              className={controls.iconBtnDanger}
              aria-label={`Remove ${item.name} from album`}
              onClick={() => removeItem(item.trackId)}
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className={`${controls.btn} ${styles.add}`}
        onClick={onAddTrack}
      >
        <Plus size={18} strokeWidth={2} />
        Add track
      </button>
      <p className={styles.hint}>
        Order and removals apply when you Save. Track details and recordings
        save instantly from the track editor.
      </p>
    </div>
  );
}
