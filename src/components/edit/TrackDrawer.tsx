"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Trash2, X } from "lucide-react";
import type { AlbumVersion, TrackDetails } from "@/lib/types";
import {
  createTrack,
  deleteTrackAndFiles,
  getTrackDetails,
  updateTrack,
} from "@/lib/edit";
import { usePlayer } from "@/player/PlayerProvider";
import { useAlbumEdit } from "./AlbumEditProvider";
import VersionsSection from "./VersionsSection";
import controls from "./controls.module.css";
import styles from "./TrackDrawer.module.css";

type Fields = { name: string; description: string; lyrics: string };

const EMPTY: Fields = { name: "", description: "", lyrics: "" };

function fieldsFrom(track: TrackDetails): Fields {
  return {
    name: track.name,
    description: track.description ?? "",
    lyrics: track.lyrics ?? "",
  };
}

function orNull(value: string): string | null {
  return value.trim() ? value : null;
}

/**
 * Sheet for creating and editing a track and its versions (LyricsSheet
 * mechanics: right sheet on desktop, bottom sheet on mobile). Creation
 * morphs in place into edit mode so audio can be added right away —
 * no save-and-re-enter round trip.
 */
export default function TrackDrawer({
  trackId,
  onClose,
}: {
  /** null = create a new track on the current album. */
  trackId: string | null;
  onClose: () => void;
}) {
  const { album, refresh, removeItem } = useAlbumEdit();
  const { evict } = usePlayer();

  // Authoritative track row — fetched fresh (edit) or returned by
  // create_track (create). Never seeded from list props: update_track is a
  // full overwrite, so stale description/lyrics would destroy data.
  const [track, setTrack] = useState<TrackDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [busySubmit, setBusySubmit] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [versions, setVersions] = useState<AlbumVersion[] | null>(null);
  const [versionsDirty, setVersionsDirty] = useState(false);
  const [versionsBusy, setVersionsBusy] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [discardArmed, setDiscardArmed] = useState(false);

  const sheetRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const discardRef = useRef<HTMLDivElement>(null);
  const didFocusField = useRef(false);

  const isCreate = trackId === null && track === null;
  const seeded = trackId === null || track !== null;
  const detailsDirty = track
    ? fields.name !== track.name ||
      orNull(fields.description) !== track.description ||
      orNull(fields.lyrics) !== track.lyrics
    : fields.name.trim() !== "" ||
      fields.description.trim() !== "" ||
      fields.lyrics.trim() !== "";
  const dirty = detailsDirty || versionsDirty;
  const busy = busySubmit || deleting || versionsBusy;
  // Derived, not stored: the confirm hides the moment a commit starts or the
  // form becomes clean — it must never close the drawer mid-request.
  const showDiscard = discardArmed && dirty && !busy;

  // The Escape/backdrop handlers must see current values, not a stale render.
  const stateRef = useRef({ dirty, busy, discardArmed: showDiscard, deleteArmed });
  useEffect(() => {
    stateRef.current = { dirty, busy, discardArmed: showDiscard, deleteArmed };
  });

  const load = useCallback(() => {
    if (!trackId) return;
    getTrackDetails(trackId)
      .then((t) => {
        setLoadError(null);
        setTrack(t);
        setFields(fieldsFrom(t));
      })
      .catch((e) => setLoadError((e as Error).message));
  }, [trackId]);

  useEffect(() => {
    load();
  }, [load]);

  // Sheet chrome: lock page scroll, move focus into the dialog, restore focus.
  // The sheet itself takes focus while the seed loads (the name field is
  // still disabled then), so the Tab trap is live from the first keystroke.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const prevFocus = document.activeElement as HTMLElement | null;
    const name = nameRef.current;
    (name && !name.disabled ? name : sheetRef.current)?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus();
    };
  }, []);

  // Once the seed arrives, land focus on the name field — but only if the
  // user hasn't already moved focus somewhere else inside the sheet.
  useEffect(() => {
    if (!seeded || didFocusField.current) return;
    didFocusField.current = true;
    if (
      document.activeElement === sheetRef.current ||
      document.activeElement === document.body
    ) {
      nameRef.current?.focus();
    }
  }, [seeded]);

  const requestClose = useCallback(() => {
    const s = stateRef.current;
    if (s.busy) return;
    if (s.dirty) {
      setDiscardArmed(true);
      return;
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const s = stateRef.current;
      if (s.deleteArmed) {
        setDeleteArmed(false);
        return;
      }
      if (s.discardArmed) {
        setDiscardArmed(false);
        return;
      }
      requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestClose]);

  // An armed destructive confirm left behind must not fire on a later
  // misclick — disarm it after a few seconds (paused while the delete runs,
  // so the "Deleting…" state stays visible).
  useEffect(() => {
    if (!deleteArmed || deleting) return;
    const t = setTimeout(() => setDeleteArmed(false), 5000);
    return () => clearTimeout(t);
  }, [deleteArmed, deleting]);

  // Bring the confirm into view (the sheet may be scrolled) and put focus on
  // its safe action so Enter keeps editing.
  useEffect(() => {
    if (!showDiscard) return;
    discardRef.current?.scrollIntoView({ block: "nearest" });
    discardRef.current?.querySelector("button")?.focus();
  }, [showDiscard]);

  function onTrapTab(event: React.KeyboardEvent) {
    if (event.key !== "Tab") return;
    const root = sheetRef.current;
    if (!root) return;
    const focusables = root.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not([hidden]):not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function onSubmitDetails(event: FormEvent) {
    event.preventDefault();
    const submitted = fields;
    const name = submitted.name.trim();
    if (!name) {
      setSubmitError("Name the track first.");
      return;
    }
    // Apply the saved (normalized) values without clobbering anything the
    // user typed while the request was in flight.
    const applySaved = (saved: Fields) =>
      setFields((cur) => ({
        name: cur.name === submitted.name ? saved.name : cur.name,
        description:
          cur.description === submitted.description
            ? saved.description
            : cur.description,
        lyrics: cur.lyrics === submitted.lyrics ? saved.lyrics : cur.lyrics,
      }));
    setDiscardArmed(false);
    setBusySubmit(true);
    setSubmitError(null);
    try {
      if (track) {
        await updateTrack(
          track.id,
          name,
          orNull(submitted.description),
          orNull(submitted.lyrics)
        );
        const next = {
          ...track,
          name,
          description: orNull(submitted.description),
          lyrics: orNull(submitted.lyrics),
        };
        setTrack(next);
        applySaved(fieldsFrom(next));
      } else {
        // Morph into edit mode the moment the row exists — a failed first
        // upload must not leave a create button that would duplicate tracks.
        const row = await createTrack(
          album.id,
          name,
          orNull(submitted.description),
          orNull(submitted.lyrics)
        );
        setTrack(row);
        applySaved(fieldsFrom(row));
      }
      await refresh();
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setBusySubmit(false);
    }
  }

  async function onDeleteTrack() {
    if (!track || versions === null || versionsBusy || busySubmit) return;
    setDiscardArmed(false);
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteTrackAndFiles(track.id, versions);
      // Drop the staged row right away (the refresh payload may lag) and
      // stop the player if it was on this track or one of its versions.
      removeItem(track.id);
      evict([track.id, ...versions.map((v) => v.id)]);
      await refresh();
      onClose();
    } catch (err) {
      setDeleteError((err as Error).message);
      setDeleting(false);
    }
  }

  const title = isCreate ? "New track" : track?.name ?? "Track";

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="track-drawer-title">
      <div className={styles.backdrop} onClick={requestClose} />
      <aside
        className={styles.sheet}
        ref={sheetRef}
        tabIndex={-1}
        onKeyDown={onTrapTab}
      >
        <header className={styles.header}>
          <h3 className={styles.title} id="track-drawer-title">
            {title}
          </h3>
          <button
            type="button"
            className={styles.close}
            aria-label="Close track editor"
            disabled={busy}
            onClick={requestClose}
          >
            <X size={20} strokeWidth={2} />
          </button>
        </header>

        {showDiscard && (
          <div className={styles.discard} ref={discardRef}>
            <span className={styles.discardText}>Discard unsaved changes?</span>
            <button
              type="button"
              className={controls.btn}
              onClick={() => setDiscardArmed(false)}
            >
              Keep editing
            </button>
            <button
              type="button"
              className={controls.btnDanger}
              disabled={busy}
              onClick={() => {
                if (!stateRef.current.busy) onClose();
              }}
            >
              Discard
            </button>
          </div>
        )}

        {trackId &&
          !track &&
          (loadError ? (
            <p className={controls.error}>
              Couldn’t load the track: {loadError}{" "}
              <button type="button" className={controls.btn} onClick={load}>
                Retry
              </button>
            </p>
          ) : (
            <p className={controls.muted}>Loading track…</p>
          ))}

        <form className={styles.section} onSubmit={onSubmitDetails}>
          <span className={controls.label}>Details</span>
          <div className={controls.field}>
            <label className={controls.label} htmlFor="track-name">
              Name
            </label>
            <input
              id="track-name"
              ref={nameRef}
              className={controls.input}
              value={fields.name}
              disabled={!seeded}
              placeholder="Track name"
              onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className={controls.field}>
            <label className={controls.label} htmlFor="track-description">
              Description
            </label>
            <textarea
              id="track-description"
              className={controls.textarea}
              value={fields.description}
              disabled={!seeded}
              placeholder="A few words about this track…"
              rows={3}
              onChange={(e) =>
                setFields((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
          <div className={controls.field}>
            <label className={controls.label} htmlFor="track-lyrics">
              Lyrics
            </label>
            <textarea
              id="track-lyrics"
              className={`${controls.textarea} ${controls.lyrics}`}
              value={fields.lyrics}
              disabled={!seeded}
              placeholder="Lyrics…"
              rows={5}
              onChange={(e) =>
                setFields((f) => ({ ...f, lyrics: e.target.value }))
              }
            />
          </div>
          {submitError && <p className={controls.error}>{submitError}</p>}
          <div className={styles.formActions}>
            {isCreate ? (
              <button
                type="submit"
                className={controls.btnPrimary}
                disabled={busySubmit || !fields.name.trim()}
              >
                {busySubmit ? "Creating…" : "Create track"}
              </button>
            ) : (
              <button
                type="submit"
                className={controls.btn}
                disabled={busySubmit || !seeded || !detailsDirty}
              >
                {busySubmit ? "Saving…" : "Save details"}
              </button>
            )}
          </div>
        </form>

        {isCreate ? (
          <p className={controls.muted}>
            Create the track first — you can upload recordings right after.
          </p>
        ) : (
          track && (
            <VersionsSection
              track={track}
              autoOpenAdd={trackId === null}
              onVersionsChange={setVersions}
              onDirtyChange={setVersionsDirty}
              onBusyChange={setVersionsBusy}
            />
          )
        )}

        {track && (
          <div className={styles.dangerZone}>
            {deleteArmed ? (
              <div className={styles.dangerConfirm}>
                <p className={controls.error}>
                  Permanently deletes “{track.name}” and its{" "}
                  {versions?.length ?? 0} recording
                  {(versions?.length ?? 0) === 1 ? "" : "s"}. Immediate — not
                  undone by Cancel.
                </p>
                <div className={styles.formActions}>
                  <button
                    type="button"
                    className={controls.btn}
                    onClick={() => setDeleteArmed(false)}
                    disabled={deleting}
                  >
                    Keep track
                  </button>
                  <button
                    type="button"
                    className={controls.btnDangerArmed}
                    onClick={onDeleteTrack}
                    disabled={
                      deleting || versions === null || versionsBusy || busySubmit
                    }
                  >
                    <Trash2 size={18} strokeWidth={2} />
                    {deleting ? "Deleting…" : "Delete permanently"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className={`${controls.btnDanger} ${styles.dangerTrigger}`}
                onClick={() => setDeleteArmed(true)}
                disabled={versions === null || busy}
              >
                <Trash2 size={18} strokeWidth={2} />
                Delete track…
              </button>
            )}
            {deleteError && <p className={controls.error}>{deleteError}</p>}
          </div>
        )}
      </aside>
    </div>
  );
}
