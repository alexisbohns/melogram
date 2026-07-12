"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ChevronDown,
  Pause,
  Pencil,
  Play,
  Plus,
  Upload,
  X,
} from "lucide-react";
import type { AlbumVersion, TrackDetails } from "@/lib/types";
import {
  createVersionWithFile,
  deleteVersionAndFile,
  listTrackVersions,
  updateVersion,
  uploadVersionAudio,
  VERSION_STATUSES,
} from "@/lib/edit";
import { usePlayer } from "@/player/PlayerProvider";
import { useAlbumEdit } from "./AlbumEditProvider";
import controls from "./controls.module.css";
import styles from "./VersionsSection.module.css";

/** The user's local calendar day (toISOString would give the UTC day). */
function today(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}

type VersionFields = { name: string; status: string; date: string };

function StatusSelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className={controls.selectWrap}>
      <select
        id={id}
        className={controls.select}
        value={value}
        disabled={disabled}
        aria-label={id ? undefined : "Version status"}
        onChange={(e) => onChange(e.target.value)}
      >
        {VERSION_STATUSES.map((s) => (
          <option key={s} value={s}>
            {capitalize(s)}
          </option>
        ))}
      </select>
      <ChevronDown size={16} strokeWidth={2} className={controls.chevron} />
    </div>
  );
}

/** Real button + ref'd hidden input (CoverUploader pattern) so the file pick
    is keyboard-reachable and the disabled state is native. */
function AudioPickButton({
  label,
  fileName,
  disabled,
  onPick,
}: {
  label: string;
  fileName: string | null;
  disabled?: boolean;
  onPick: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        className={controls.btn}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={18} strokeWidth={2} />
        <span className={controls.fileName}>{fileName ?? label}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.m4a"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onPick(file);
        }}
      />
    </>
  );
}

/**
 * Versions list + editor inside the track drawer: preview through the global
 * player, add-with-upload, per-version edit (name/status/date), attach or
 * replace audio, and delete with an inline two-step confirm. All commits are
 * immediate; the parent is kept informed of busy/dirty state for its
 * close-guard.
 */
export default function VersionsSection({
  track,
  autoOpenAdd = false,
  onVersionsChange,
  onDirtyChange,
  onBusyChange,
}: {
  track: TrackDetails;
  autoOpenAdd?: boolean;
  onVersionsChange: (versions: AlbumVersion[] | null) => void;
  onDirtyChange: (dirty: boolean) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const { album, refresh } = useAlbumEdit();
  const { current, isPlaying, toggle, playFrom, evict } = usePlayer();

  const [versions, setVersions] = useState<AlbumVersion[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(autoOpenAdd);
  const [addFields, setAddFields] = useState<VersionFields>({
    name: "",
    status: "demo",
    date: today(),
  });
  const [addFile, setAddFile] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<VersionFields>({
    name: "",
    status: "demo",
    date: today(),
  });
  const [rowBusy, setRowBusy] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [armedId, setArmedId] = useState<string | null>(null);

  const reload = useCallback(
    () =>
      listTrackVersions(track.id)
        .then((list) => {
          setListError(null);
          setVersions(list);
        })
        .catch((e) => setListError((e as Error).message)),
    [track.id]
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    onVersionsChange(versions);
  }, [versions, onVersionsChange]);

  const editing = editingId
    ? versions?.find((v) => v.id === editingId) ?? null
    : null;
  const editDirty = Boolean(
    editing &&
      (editFields.name !== editing.name ||
        editFields.status !== editing.status ||
        editFields.date !== editing.release_date)
  );
  const addDirty = addOpen && (addFields.name.trim() !== "" || addFile !== null);
  const dirty = addDirty || editDirty;
  const busy = adding || rowBusy;

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);

  // Auto-disarm the remove confirm, and let Escape disarm it before the
  // drawer's own Escape handler runs (capture phase + preventDefault).
  useEffect(() => {
    if (!armedId) return;
    const t = setTimeout(() => setArmedId(null), 5000);
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setArmedId(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [armedId]);

  const playable = useMemo(
    () => (versions ?? []).filter((v) => v.resource_url),
    [versions]
  );

  function onPreview(version: AlbumVersion) {
    if (!version.resource_url) return;
    // Same id but a different URL means the audio was just replaced —
    // rebuild the queue so the new file loads instead of resuming the old.
    if (current?.id === version.id && current.url === version.resource_url) {
      toggle();
      return;
    }
    playFrom(
      playable.map((v) => ({
        id: v.id,
        name: `${v.name} — ${track.name}`,
        url: v.resource_url!,
        albumId: album.id,
        albumName: album.name,
        coverUrl: album.cover_url,
      })),
      playable.findIndex((v) => v.id === version.id)
    );
  }

  function openEditor(version: AlbumVersion) {
    setEditingId(version.id);
    setEditFields({
      name: version.name,
      status: version.status,
      date: version.release_date,
    });
    setRowError(null);
    setArmedId(null);
  }

  function closeEditor() {
    setEditingId(null);
    setRowError(null);
    setArmedId(null);
  }

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    if (!addFile) {
      setAddError("Pick an audio file first.");
      return;
    }
    const name = addFields.name.trim();
    if (!name) {
      setAddError("Name the version first.");
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      await createVersionWithFile(
        track.id,
        name,
        addFields.status,
        addFields.date || today(),
        addFile
      );
      setAddFields({ name: "", status: "demo", date: today() });
      setAddFile(null);
      setAddOpen(false);
      await reload();
      await refresh();
    } catch (e) {
      setAddError((e as Error).message);
    } finally {
      setAdding(false);
    }
  }

  async function onSaveVersion(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const name = editFields.name.trim();
    if (!name) {
      setRowError("Name the version first.");
      return;
    }
    setRowBusy(true);
    setRowError(null);
    try {
      await updateVersion(
        editing.id,
        name,
        editFields.status,
        editFields.date || editing.release_date
      );
      await reload();
      await refresh();
      closeEditor();
    } catch (e) {
      setRowError((e as Error).message);
    } finally {
      setRowBusy(false);
    }
  }

  async function onReplaceAudio(version: AlbumVersion, file: File) {
    setRowBusy(true);
    setRowError(null);
    try {
      await uploadVersionAudio(version, file);
      await reload();
      await refresh();
    } catch (e) {
      setRowError((e as Error).message);
    } finally {
      setRowBusy(false);
    }
  }

  async function onRemove(version: AlbumVersion) {
    setRowBusy(true);
    setRowError(null);
    try {
      await deleteVersionAndFile(version);
      evict([version.id]);
      await reload();
      await refresh();
      closeEditor();
    } catch (e) {
      setRowError((e as Error).message);
    } finally {
      setRowBusy(false);
      setArmedId(null);
    }
  }

  return (
    <section className={styles.section} aria-label="Versions">
      <div className={styles.sectionHead}>
        <span className={controls.label}>Versions</span>
        {versions && versions.length > 0 && (
          <span className={controls.muted}>{versions.length}</span>
        )}
      </div>

      {listError && (
        <p className={controls.error}>
          Couldn’t load versions: {listError}{" "}
          <button type="button" className={controls.btn} onClick={reload}>
            Retry
          </button>
        </p>
      )}

      {versions === null && !listError && (
        <p className={controls.muted}>Loading versions…</p>
      )}

      {versions && versions.length === 0 && (
        <p className={controls.muted}>
          No versions yet — upload the first recording below.
        </p>
      )}

      {versions && versions.length > 0 && (
        <ul className={styles.list}>
          {versions.map((v) => {
            const active = current?.id === v.id && isPlaying;
            const isEditing = editingId === v.id;
            return (
              <li key={v.id} className={styles.row}>
                <div className={styles.rowMain}>
                  <button
                    type="button"
                    className={`${controls.iconBtn} ${active ? controls.iconBtnActive : ""}`}
                    disabled={!v.resource_url}
                    aria-label={active ? `Pause ${v.name}` : `Play ${v.name}`}
                    onClick={() => onPreview(v)}
                  >
                    {active ? (
                      <Pause size={20} strokeWidth={2} />
                    ) : (
                      <Play size={20} strokeWidth={2} />
                    )}
                  </button>
                  <div className={styles.rowBody}>
                    <span className={styles.rowName}>{v.name}</span>
                    <span className={styles.rowMeta}>
                      <span className={controls.chip}>{v.status}</span>
                      <span className={styles.rowDate}>{v.release_date}</span>
                      {!v.resource_url && (
                        <span className={styles.noAudio}>No audio</span>
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={controls.iconBtnSm}
                    aria-label={`Edit ${v.name}`}
                    aria-expanded={isEditing}
                    onClick={() => (isEditing ? closeEditor() : openEditor(v))}
                  >
                    {isEditing ? (
                      <X size={18} strokeWidth={2} />
                    ) : (
                      <Pencil size={18} strokeWidth={2} />
                    )}
                  </button>
                </div>

                {isEditing && (
                  <form className={styles.editor} onSubmit={onSaveVersion}>
                    <div className={styles.fieldGrid}>
                      <div className={`${controls.field} ${styles.spanFields}`}>
                        <label
                          className={controls.label}
                          htmlFor={`version-name-${v.id}`}
                        >
                          Name
                        </label>
                        <input
                          id={`version-name-${v.id}`}
                          className={controls.input}
                          value={editFields.name}
                          onChange={(e) =>
                            setEditFields((f) => ({ ...f, name: e.target.value }))
                          }
                        />
                      </div>
                      <div className={controls.field}>
                        <label
                          className={controls.label}
                          htmlFor={`version-status-${v.id}`}
                        >
                          Status
                        </label>
                        <StatusSelect
                          id={`version-status-${v.id}`}
                          value={editFields.status}
                          onChange={(status) =>
                            setEditFields((f) => ({ ...f, status }))
                          }
                        />
                      </div>
                      <div className={controls.field}>
                        <label
                          className={controls.label}
                          htmlFor={`version-date-${v.id}`}
                        >
                          Date
                        </label>
                        <input
                          id={`version-date-${v.id}`}
                          type="date"
                          className={controls.input}
                          value={editFields.date}
                          onChange={(e) =>
                            setEditFields((f) => ({ ...f, date: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div className={styles.editorActions}>
                      <button
                        type="submit"
                        className={controls.btn}
                        disabled={rowBusy || !editDirty}
                      >
                        {rowBusy ? "Saving…" : "Save"}
                      </button>
                      <AudioPickButton
                        label={v.resource_url ? "Replace audio…" : "Add audio…"}
                        fileName={null}
                        disabled={rowBusy}
                        onPick={(file) => onReplaceAudio(v, file)}
                      />
                      <span className={styles.editorSpacer} />
                      {armedId === v.id ? (
                        <>
                          <button
                            type="button"
                            className={controls.btn}
                            disabled={rowBusy}
                            onClick={() => setArmedId(null)}
                          >
                            Keep
                          </button>
                          <button
                            type="button"
                            className={controls.btnDangerArmed}
                            disabled={rowBusy}
                            onClick={() => onRemove(v)}
                          >
                            {rowBusy ? "Removing…" : "Really remove"}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className={controls.btnDanger}
                          disabled={rowBusy}
                          onClick={() => setArmedId(v.id)}
                        >
                          Remove…
                        </button>
                      )}
                    </div>
                    {armedId === v.id && (
                      <p className={controls.error}>
                        Also deletes its audio file. Immediate — not undone by
                        Cancel.
                      </p>
                    )}
                    {rowError && <p className={controls.error}>{rowError}</p>}
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {addOpen ? (
        <form className={styles.addForm} onSubmit={onAdd}>
          <div className={styles.fieldGrid}>
            <div className={`${controls.field} ${styles.spanFields}`}>
              <label className={controls.label} htmlFor="new-version-name">
                Name
              </label>
              <input
                id="new-version-name"
                className={controls.input}
                value={addFields.name}
                placeholder="e.g. First demo"
                onChange={(e) =>
                  setAddFields((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className={controls.field}>
              <label className={controls.label} htmlFor="new-version-status">
                Status
              </label>
              <StatusSelect
                id="new-version-status"
                value={addFields.status}
                onChange={(status) => setAddFields((f) => ({ ...f, status }))}
              />
            </div>
            <div className={controls.field}>
              <label className={controls.label} htmlFor="new-version-date">
                Date
              </label>
              <input
                id="new-version-date"
                type="date"
                className={controls.input}
                value={addFields.date}
                onChange={(e) =>
                  setAddFields((f) => ({ ...f, date: e.target.value }))
                }
              />
            </div>
          </div>
          <div className={styles.editorActions}>
            <AudioPickButton
              label="Choose audio…"
              fileName={addFile?.name ?? null}
              disabled={adding}
              onPick={(file) => {
                setAddFile(file);
                setAddFields((f) =>
                  f.name.trim() ? f : { ...f, name: stripExtension(file.name) }
                );
              }}
            />
            <span className={styles.editorSpacer} />
            <button
              type="button"
              className={controls.btn}
              disabled={adding}
              onClick={() => {
                setAddOpen(false);
                setAddError(null);
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={controls.btnPrimary}
              disabled={adding}
            >
              {adding ? "Uploading…" : "Add version"}
            </button>
          </div>
          {addError && <p className={controls.error}>{addError}</p>}
        </form>
      ) : (
        <button
          type="button"
          className={`${controls.btn} ${styles.addTrigger}`}
          onClick={() => {
            setAddOpen(true);
            setAddError(null);
          }}
        >
          <Plus size={18} strokeWidth={2} />
          Add version
        </button>
      )}
    </section>
  );
}
