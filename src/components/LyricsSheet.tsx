"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import styles from "./LyricsSheet.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  trackName: string;
  lyrics: string;
};

export default function LyricsSheet({ open, onClose, trackName, lyrics }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.backdrop} onClick={onClose} />
      <aside className={styles.sheet}>
        <header className={styles.header}>
          <h3 className={styles.title}>{trackName}</h3>
          <button
            type="button"
            className={styles.close}
            aria-label="Close lyrics"
            onClick={onClose}
          >
            <X size={20} strokeWidth={2} />
          </button>
        </header>
        <div className={styles.lyrics}>{lyrics}</div>
      </aside>
    </div>
  );
}
