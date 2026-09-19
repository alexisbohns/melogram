"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Disc3,
  Mic,
  Music,
  Pause,
  Play,
  Repeat,
  Repeat1,
  SkipBack,
  SkipForward,
} from "lucide-react";
import type WaveSurfer from "wavesurfer.js";
import { paletteVars } from "@/lib/palettes";
import { useAlbumPalette } from "@/lib/albumPalette";
import { formatTime } from "@/player/durations";
import { usePlayer } from "@/player/PlayerProvider";
import { renderWaveform, alpha } from "@/player/waveform";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import { Vinyl } from "vinyl-kit";
import { VINYL_MASK_URL, albumVinylVars, nextVinylImage } from "@/lib/vinyl";
import LyricsSheet from "./LyricsSheet";
import styles from "./PlayerBar.module.css";

export default function PlayerBar() {
  const player = usePlayer();
  const { current, isPlaying, repeat, time, duration } = player;
  const m = useMessages();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const loadedUrl = useRef<string | null>(null);
  const [wsReady, setWsReady] = useState(false);

  // Expanded details drawer (description + Album/Lyrics actions), toggled by
  // tapping the vinyl or the track name.
  const [expanded, setExpanded] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);

  // A freshly-started track always appears collapsed: reset the drawer whenever
  // the current track changes (or the bar hides). Adjusting state during render
  // — rather than in an effect — is React's recommended way to reset on a
  // changing value, and avoids a cascading re-render.
  const trackId = current?.id ?? null;
  const [shownTrackId, setShownTrackId] = useState(trackId);
  if (trackId !== shownTrackId) {
    setShownTrackId(trackId);
    setExpanded(false);
    setLyricsOpen(false);
  }

  // the seek callback changes identity across renders; the wavesurfer
  // 'interaction' handler is registered once, so it reads through a ref
  const seekRef = useRef(player.seek);
  useEffect(() => {
    seekRef.current = player.seek;
  }, [player.seek]);

  // One palette for the whole bar — the album's own, or one derived from its
  // cover. The waveform colours below are derived from it, so a cover-sampled
  // accent arriving late re-tints the waveform along with everything else.
  const palette = useAlbumPalette({
    id: current?.albumId ?? "",
    name: current?.albumName ?? "",
    theme: current?.theme,
    coverUrl: current?.coverUrl,
  });
  const waveColor = alpha(palette.accent, 0.4);
  const progressColor = palette.light;

  // Create the render-only wavesurfer on first playback. It *shares* the
  // provider's single <audio> element (the `media` option) rather than
  // creating its own — two elements playing the same track confuse iOS, which
  // binds the lock-screen play/pause state to the wrong (never-played) element
  // and shows a stale ▶︎. Sharing keeps exactly one media element, so the
  // lock-screen controls track real playback. Wavesurfer still only decodes +
  // draws the file and reports scrub interactions; it never drives playback.
  const audioElement = player.audioElement;
  useEffect(() => {
    if (!current || wsRef.current || !containerRef.current || !audioElement)
      return;
    let cancelled = false;
    const media = audioElement;
    const url = current.url;
    // Wavesurfer's `peaks` option wants one array per channel (we only ever
    // stored one). Deliberately NOT passing a `duration` alongside it: the
    // known footgun is a *wrong* duration — wavesurfer trusts whatever number
    // you give it and stretches the wave to fit, and nothing here corrects it
    // later. We have no duration we can vouch for at this instant (the
    // player's live `duration` state is reset to 0 on every track change,
    // until the shared element's own "loadedmetadata" fires). Leaving
    // `duration` out is safe: wavesurfer's loader falls back to the real
    // media duration itself (immediately if already known, else it waits for
    // "loadedmetadata" the same way it would without peaks at all) and pairs
    // it with these peaks — so what we skip is only the expensive part, the
    // full-file fetch + client-side decode that building peaks from scratch
    // requires, which is exactly the cost Task 2's migration exists to avoid.
    const peaks = current.peaks ? [current.peaks] : undefined;
    import("wavesurfer.js").then(({ default: WS }) => {
      if (cancelled || wsRef.current || !containerRef.current) return;
      const ws = WS.create({
        container: containerRef.current,
        height: 32,
        interact: true,
        dragToSeek: true,
        cursorWidth: 0,
        renderFunction: renderWaveform,
        // Share the provider's audio element instead of muting a second one.
        media,
        waveColor,
        progressColor,
        peaks,
      });
      ws.on("interaction", (newTime: number) => seekRef.current(newTime));
      wsRef.current = ws;
      // wavesurfer auto-loads from the shared element's existing src, so mark
      // this URL loaded to keep the effect below from re-fetching it.
      loadedUrl.current = url;
      setWsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [current, audioElement, waveColor, progressColor]);

  useEffect(
    () => () => {
      wsRef.current?.destroy();
      wsRef.current = null;
    },
    []
  );

  // Load the waveform + recolor to the album palette when the track changes.
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || !current) return;
    ws.setOptions({ waveColor, progressColor });
    if (loadedUrl.current !== current.url) {
      loadedUrl.current = current.url;
      // Pass this track's own stored peaks (same reasoning as the creation
      // effect above: no `duration` argument, so wavesurfer pairs them with
      // the real media duration once it knows it, instead of a value we
      // can't currently vouch for). Without this, the wave would only ever
      // paint from stored peaks for the very first track played each
      // session — every subsequent track lands here and would otherwise
      // fall back to a full fetch + decode.
      const peaks = current.peaks ? [current.peaks] : undefined;
      ws.load(current.url, peaks).catch(() => {});
    }
  }, [wsReady, current, waveColor, progressColor]);

  // The waveform cursor follows the shared media element's own timeupdate
  // events, so no manual time-syncing is needed here. (Calling setTime on the
  // shared element would re-seek real playback and stutter it.)

  const hasLyrics = Boolean(current?.lyrics);
  const canExpand = Boolean(current);

  return (
    <>
      <div
        className={styles.bar}
        data-player-visible={current ? "true" : "false"}
        data-playing={isPlaying ? "true" : "false"}
        data-expanded={expanded ? "true" : "false"}
        aria-hidden={current ? undefined : true}
        style={current ? paletteVars(palette) : undefined}
      >
        <div className={styles.inner}>
          <button
            type="button"
            className={styles.meta}
            aria-expanded={expanded}
            title={expanded ? m.player.collapse : m.player.expand}
            disabled={!canExpand}
            onClick={() => setExpanded((v) => !v)}
          >
            <div className={styles.disc}>
              <Vinyl
                fill
                cover={current?.coverUrl ?? null}
                spinning={isPlaying}
                maskUrl={VINYL_MASK_URL}
                renderImage={nextVinylImage()}
                style={albumVinylVars}
              />
            </div>
            <div className={styles.titles}>
              <span
                className={`${styles.trackName} ${isPlaying ? "shimmer" : ""}`}
              >
                {current?.name}
              </span>
              <span className={styles.albumName}>{current?.albumName}</span>
            </div>
            <ChevronDown
              className={styles.chevron}
              size={18}
              strokeWidth={2}
              aria-hidden
            />
          </button>

          <div className={styles.timeline}>
            <span className={styles.time}>{formatTime(time)}</span>
            <div ref={containerRef} className={styles.waveform} />
            <span className={styles.time}>
              {duration > 0 ? formatTime(duration) : "–:–"}
            </span>
          </div>

          <div className={styles.controls}>
            <button
              type="button"
              className={`${styles.controlButton} ${styles.stepButton}`}
              aria-label="Previous track"
              onClick={player.previous}
            >
              <SkipBack size={20} strokeWidth={2} />
            </button>
            <button
              type="button"
              className={styles.playButton}
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={player.toggle}
            >
              {isPlaying ? (
                <Pause size={20} strokeWidth={2} />
              ) : (
                <Play size={20} strokeWidth={2} />
              )}
            </button>
            <button
              type="button"
              className={`${styles.controlButton} ${styles.stepButton}`}
              aria-label="Next track"
              onClick={player.next}
            >
              <SkipForward size={20} strokeWidth={2} />
            </button>
            <button
              type="button"
              className={`${styles.controlButton} ${styles.repeatButton} ${
                repeat === "none" ? styles.repeatOff : ""
              }`}
              aria-label={`Repeat mode: ${repeat}`}
              title={`Repeat: ${repeat}`}
              onClick={player.cycleRepeat}
            >
              {repeat === "one" ? (
                <Repeat1 size={20} strokeWidth={2} />
              ) : (
                <Repeat size={20} strokeWidth={2} />
              )}
            </button>
          </div>
        </div>

        <div className={styles.expansion}>
          <div className={styles.expansionClip}>
            <div className={styles.expansionInner}>
              {current?.description && (
                <p className={styles.description}>{current.description}</p>
              )}
              <div className={styles.expandActions}>
                {current?.id && (
                  <Link
                    href={`/tracks/${current.id}`}
                    className={styles.expandButton}
                    onClick={() => setExpanded(false)}
                  >
                    <Music size={16} strokeWidth={2} aria-hidden />
                    {m.player.track}
                  </Link>
                )}
                {current?.albumId && (
                  <Link
                    href={`/albums/${current.albumId}`}
                    className={styles.expandButton}
                    onClick={() => setExpanded(false)}
                  >
                    <Disc3 size={16} strokeWidth={2} aria-hidden />
                    {m.player.album}
                  </Link>
                )}
                {hasLyrics && (
                  <button
                    type="button"
                    className={styles.expandButton}
                    onClick={() => setLyricsOpen(true)}
                  >
                    <Mic size={16} strokeWidth={2} aria-hidden />
                    {m.player.lyrics}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {hasLyrics && current && (
        <div style={current ? paletteVars(palette) : undefined}>
          <LyricsSheet
            open={lyricsOpen}
            onClose={() => setLyricsOpen(false)}
            trackName={current.name}
            lyrics={current.lyrics ?? ""}
          />
        </div>
      )}
    </>
  );
}
