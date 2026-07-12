"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import type { AlbumVersion } from "@/lib/types";
import {
  listTrackVersions,
  createVersionWithFile,
  updateVersion,
  deleteVersion,
  VERSION_STATUSES,
} from "@/lib/edit";
import styles from "./VersionsPanel.module.css";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function VersionsPanel({ trackId }: { trackId: string }) {
  const [versions, setVersions] = useState<AlbumVersion[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<string>("demo");
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = () =>
    listTrackVersions(trackId)
      .then(setVersions)
      .catch((e) => console.error("load versions", e));

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId]);

  async function onAdd() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      alert("Pick an audio file first.");
      return;
    }
    if (!name.trim()) {
      alert("Name the version first.");
      return;
    }
    setBusy(true);
    try {
      await createVersionWithFile(trackId, name.trim(), status, today(), file);
      setName("");
      if (fileRef.current) fileRef.current.value = "";
      await reload();
    } catch (e) {
      console.error("create version", e);
      alert("Upload failed: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onStatusChange(v: AlbumVersion, next: string) {
    setVersions((list) =>
      list?.map((x) => (x.id === v.id ? { ...x, status: next } : x)) ?? null
    );
    try {
      await updateVersion(v.id, v.name, next, v.release_date);
    } catch (e) {
      console.error("update version", e);
      await reload();
    }
  }

  async function onDelete(v: AlbumVersion) {
    if (!confirm(`Delete version “${v.name}”?`)) return;
    try {
      await deleteVersion(v.id);
      await reload();
    } catch (e) {
      console.error("delete version", e);
      alert("Delete failed: " + (e as Error).message);
    }
  }

  return (
    <div className={styles.panel}>
      {versions === null ? (
        <p className={styles.muted}>Loading versions…</p>
      ) : versions.length === 0 ? (
        <p className={styles.muted}>No versions yet.</p>
      ) : (
        <ul className={styles.versions}>
          {versions.map((v) => (
            <li key={v.id} className={styles.version}>
              <span className={styles.vName}>{v.name}</span>
              <select
                value={v.status}
                aria-label={`Status of ${v.name}`}
                onChange={(e) => onStatusChange(v, e.target.value)}
              >
                {VERSION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <span className={styles.date}>{v.release_date}</span>
              {v.resource_url ? (
                <span className={styles.ok}>♪</span>
              ) : (
                <span className={styles.muted}>no file</span>
              )}
              <button
                type="button"
                aria-label={`Delete ${v.name}`}
                className={styles.del}
                onClick={() => onDelete(v)}
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.add}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Version name…"
          aria-label="New version name"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="New version status"
        >
          {VERSION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input ref={fileRef} type="file" accept="audio/*,.m4a" aria-label="Audio file" />
        <button type="button" onClick={onAdd} disabled={busy}>
          <Upload size={15} /> {busy ? "Uploading…" : "Add version"}
        </button>
      </div>
    </div>
  );
}
