"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUp, ArrowDown, Check, RotateCcw } from "lucide-react";
import AlbumCover from "@/components/AlbumCover";
import PaletteScope from "@/components/PaletteScope";
import type { OrderableAlbum } from "@/lib/data";
import { reorderAlbums } from "@/lib/edit";
import { revalidateContent } from "@/lib/revalidate";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import controls from "./controls.module.css";
import styles from "./AlbumOrderList.module.css";

/** Swap the item at `index` with its neighbour, or return the list untouched
    when the move would fall off either end. */
function move(
  albums: OrderableAlbum[],
  index: number,
  delta: number
): OrderableAlbum[] {
  const target = index + delta;
  if (target < 0 || target >= albums.length) return albums;
  const next = [...albums];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function sameOrder(a: OrderableAlbum[], b: OrderableAlbum[]): boolean {
  return a.length === b.length && a.every((album, i) => album.id === b[i].id);
}

/**
 * Artist-only home-page album ordering. Moves are staged locally (so a burst
 * of up/down clicks costs one write) and committed as one full ranking, which
 * keeps positions gap-free even if two albums are reordered at once.
 */
export default function AlbumOrderList({
  artistId,
  albums: initial,
}: {
  artistId: string;
  albums: OrderableAlbum[];
}) {
  const m = useMessages();
  const router = useRouter();

  // The last persisted order — the baseline for `dirty` and for Reset.
  const [saved, setSaved] = useState(initial);
  const [albums, setAlbums] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const dirty = !sameOrder(albums, saved);

  function reorder(index: number, delta: number) {
    setAlbums((prev) => move(prev, index, delta));
    setJustSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await reorderAlbums(
        artistId,
        albums.map((album) => album.id)
      );
      setSaved(albums);
      setJustSaved(true);
      // The home page is statically cached; purge it so the new order shows.
      await revalidateContent();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (albums.length === 0) {
    return <p className={styles.empty}>{m.albumOrder.empty}</p>;
  }

  return (
    <div className={styles.wrap}>
      <ol className={styles.list}>
        {albums.map((album, i) => (
          <li key={album.id} className={styles.row}>
            <span className={styles.rank}>{i + 1}</span>
            <PaletteScope album={{ ...album, coverUrl: album.cover_url }}>
              <Link
                href={`/albums/${album.id}`}
                className={styles.album}
                aria-label={album.name}
              >
                <AlbumCover coverUrl={album.cover_url} alt="" size={48} />
                <span className={styles.text}>
                  <span className={styles.name}>{album.name}</span>
                  {!album.onHome && (
                    <span className={styles.hidden}>
                      {m.albumOrder.hidden}
                    </span>
                  )}
                </span>
              </Link>
            </PaletteScope>
            <div className={styles.actions}>
              <button
                type="button"
                className={controls.iconBtnSm}
                aria-label={m.albumOrder.moveUp.replace("{name}", album.name)}
                disabled={i === 0 || saving}
                onClick={() => reorder(i, -1)}
              >
                <ArrowUp size={18} strokeWidth={2} />
              </button>
              <button
                type="button"
                className={controls.iconBtnSm}
                aria-label={m.albumOrder.moveDown.replace("{name}", album.name)}
                disabled={i === albums.length - 1 || saving}
                onClick={() => reorder(i, 1)}
              >
                <ArrowDown size={18} strokeWidth={2} />
              </button>
            </div>
          </li>
        ))}
      </ol>

      <p className={styles.hint}>{m.albumOrder.hiddenHint}</p>

      <div className={styles.bar}>
        <button
          type="button"
          className={controls.btn}
          disabled={!dirty || saving}
          onClick={() => {
            setAlbums(saved);
            setError(null);
          }}
        >
          <RotateCcw size={18} strokeWidth={2} />
          <span>{m.albumOrder.reset}</span>
        </button>
        <button
          type="button"
          className={controls.btnPrimary}
          disabled={!dirty || saving}
          onClick={save}
        >
          <Check size={18} strokeWidth={2} />
          <span>{saving ? m.albumOrder.saving : m.albumOrder.save}</span>
        </button>
        {justSaved && !dirty && (
          <span className={styles.savedNote} role="status">
            {m.albumOrder.saved}
          </span>
        )}
      </div>

      {error && (
        <p className={controls.error}>
          {m.albumOrder.error}: {error}
        </p>
      )}
    </div>
  );
}
