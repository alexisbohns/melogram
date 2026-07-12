"use client";

import { useRef, useState, type CSSProperties } from "react";
import { Upload } from "lucide-react";
import AlbumCover from "../AlbumCover";
import { uploadAlbumCover } from "@/lib/edit";
import styles from "./CoverUploader.module.css";

export default function CoverUploader({
  albumId,
  coverUrl,
  alt,
  size,
}: {
  albumId: string;
  coverUrl: string | null;
  alt: string;
  size: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(coverUrl);
  const [busy, setBusy] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      // the stored URL is already cache-busted by uploadAlbumCover
      setUrl(await uploadAlbumCover(albumId, file));
    } catch (err) {
      console.error("cover upload", err);
      alert("Cover upload failed: " + (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={styles.wrap}
      style={{ "--size": `${size}px` } as CSSProperties}
    >
      <AlbumCover coverUrl={url} alt={alt} size={size} priority />
      <button
        type="button"
        className={styles.overlay}
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label="Replace cover"
      >
        <Upload size={20} strokeWidth={2} />
        <span>{busy ? "Uploading…" : "Replace"}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onPick}
      />
    </div>
  );
}
