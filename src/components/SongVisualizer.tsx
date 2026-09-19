"use client";

import { useEffect, useRef } from "react";
import type WaveSurfer from "wavesurfer.js";
import { toPlayerTrack, usePlayer } from "@/player/PlayerProvider";
import { useAlbumPalette } from "@/lib/albumPalette";
import type { AlbumPalette } from "@/lib/palettes";
import { formatTime } from "@/player/durations";
import { renderWaveform, alpha } from "@/player/waveform";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Track } from "@/lib/types";
import PlayButton from "./PlayButton";
import styles from "./SongVisualizer.module.css";

type Props = {
  track: Track;
  lyrics: string | null;
};

/**
 * The track page's transport — the ONLY place to play on that page (the
 * hero's own play button is being removed once this ships). A play button, a
 * waveform, and a duration.
 *
 * This track is usually NOT the one playing, so the component has two
 * genuinely different modes:
 *
 *  - idle (`current?.id !== track.track_id`): an own `<canvas>`, painted once
 *    from the track's stored `peaks`. No wavesurfer, no audio element, no
 *    network — this is the common case (browsing a track you're not
 *    listening to) and it must stay cheap.
 *  - live (this track IS `player.current`): a wavesurfer instance attached to
 *    the provider's single shared `<audio>` element, exactly as PlayerBar
 *    does it (see the long comment on its creation effect — a second media
 *    element confuses iOS's lock-screen controls).
 *
 * Rather than one component mutating itself across that transition, `IdleWave`
 * and `LiveWave` are separate components picked by `live`, each keyed to its
 * mode — React remounts (destroying any wavesurfer instance / canvas) instead
 * of trying to migrate one rendering strategy into the other.
 */
export default function SongVisualizer({ track, lyrics }: Props) {
  const player = usePlayer();
  const locale = useLocale();
  const live = player.current?.id === track.track_id;
  const playing = live && player.isPlaying;
  const playable = Boolean(track.latest_resource_url);

  // Resolved independently of the page's PaletteScope, same as PlayerBar:
  // the CSS custom properties from PaletteScope aren't readable from JS, and
  // the wavesurfer options / canvas fill below need real hex values.
  const palette = useAlbumPalette({
    id: track.album_id ?? undefined,
    name: track.album_name ?? undefined,
    theme: track.album_theme ?? undefined,
    coverUrl: track.album_cover_url,
  });

  const onPlayClick = () => {
    if (!playable) return;
    if (live) {
      player.toggle();
      return;
    }
    player.playFrom([toPlayerTrack(track, lyrics, locale)], 0);
  };

  return (
    <div className={styles.visualizer}>
      <PlayButton
        playing={playing}
        disabled={!playable}
        label={playing ? `Pause ${track.track_name}` : `Play ${track.track_name}`}
        onClick={onPlayClick}
      />

      {live ? (
        <LiveWave
          key="live"
          player={player}
          palette={palette}
          peaks={track.peaks ?? null}
        />
      ) : (
        <IdleWave
          key="idle"
          peaks={track.peaks ?? null}
          palette={palette}
          onPlayClick={onPlayClick}
        />
      )}

      <span className={styles.time}>
        {live
          ? `${formatTime(player.time)} / ${formatTime(player.duration)}`
          : track.duration !== null
            ? formatTime(track.duration)
            : "–:–"}
      </span>
    </div>
  );
}

/**
 * Idle mode: paints the stored waveform once onto a plain canvas. No
 * wavesurfer import, no audio element — just `renderWaveform` against a 2D
 * context, the same renderer PlayerBar hands to wavesurfer as its
 * `renderFunction` (its signature is exactly a canvas renderFunction's,
 * which is why it also works called directly like this).
 *
 * The canvas is repainted (not just resized) on every ResizeObserver tick:
 * changing `canvas.width`/`height` clears the bitmap AND resets the 2D
 * context's transform, so there's nothing stale to carry across a resize.
 *
 * Accessibility: this container is `aria-hidden` and not a real button. It's
 * a mouse/touch convenience — clicking it plays the track — but the
 * accessible, keyboard-reachable control is the adjacent `PlayButton`, which
 * covers the same action. This mirrors PlayerBar's own waveform container,
 * which is likewise a plain interactive div beside an explicit play button
 * rather than a second labeled control duplicating the first one's name.
 */
function IdleWave({
  peaks,
  palette,
  onPlayClick,
}: {
  peaks: number[] | null;
  palette: AlbumPalette;
  onPlayClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container || !peaks) return;

    const paint = () => {
      const width = container.clientWidth;
      const height = 32;
      if (width <= 0) return;
      // Match wavesurfer's own canvas sizing exactly (renderer.js
      // `renderSingleCanvas`): the backing buffer is CSS size × device pixel
      // ratio, the CSS size stays as-is, and — crucially — the render
      // function draws directly against `ctx.canvas.width/height` in that
      // device-pixel space rather than through a scaled context. Calling
      // `ctx.scale(dpr, dpr)` on top would double-scale the wave.
      const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = alpha(palette.accent, 0.4);
      renderWaveform([peaks], ctx);
    };

    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(container);
    return () => observer.disconnect();
  }, [peaks, palette.accent]);

  // A version the backfill couldn't decode has no peaks: render the same
  // height so the transport doesn't jump, but no canvas and no fabricated
  // wave.
  if (!peaks) return <div className={styles.wave} />;

  return (
    <div className={styles.wave} onClick={onPlayClick} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}

/**
 * Live mode: a wavesurfer instance sharing the provider's single `<audio>`
 * element, created with the exact option set PlayerBar uses — read its
 * creation effect for why each one is there (`media` instead of a second
 * audio source, `peaks` so it never fetches/decodes, no `duration` so it
 * takes the shared element's real one instead of a wrong guess).
 *
 * Unlike PlayerBar, this component only ever exists for ONE fixed track — the
 * parent remounts it (via `key`) rather than keep it alive across a track
 * change — so there's no need for PlayerBar's second effect that reloads a
 * new URL into a persistent instance. Wavesurfer auto-loads from the shared
 * element's already-playing src.
 */
function LiveWave({
  player,
  palette,
  peaks,
}: {
  player: ReturnType<typeof usePlayer>;
  palette: AlbumPalette;
  /**
   * The PAGE's stored peaks, not `player.current.peaks`. A queue entry built
   * on the home or album page carries none — those pages deliberately don't
   * fetch them — so reading them off the player left this with nothing to
   * draw whenever playback started somewhere else.
   */
  peaks: number[] | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);

  // The seek callback changes identity across renders; the wavesurfer
  // 'interaction' handler is registered once, so it reads through a ref —
  // same reasoning as PlayerBar.
  const seekRef = useRef(player.seek);
  useEffect(() => {
    seekRef.current = player.seek;
  }, [player.seek]);

  const current = player.current;
  const audioElement = player.audioElement;
  const waveColor = alpha(palette.accent, 0.4);
  const progressColor = palette.light;

  useEffect(() => {
    if (!current || wsRef.current || !containerRef.current || !audioElement)
      return;
    let cancelled = false;
    const media = audioElement;
    const channels = peaks ? [peaks] : undefined;
    const url = current.url;
    import("wavesurfer.js").then(({ default: WS }) => {
      if (cancelled || wsRef.current || !containerRef.current) return;
      const ws = WS.create({
        container: containerRef.current,
        height: 32,
        interact: true,
        dragToSeek: true,
        cursorWidth: 0,
        renderFunction: renderWaveform,
        // Share the provider's audio element instead of creating a second one.
        media,
        waveColor,
        progressColor,
      });
      ws.on("interaction", (newTime: number) => seekRef.current(newTime));
      wsRef.current = ws;
      // Load explicitly rather than relying on wavesurfer picking up the
      // shared element's src: this component usually mounts into playback
      // that is ALREADY under way (you navigate here from wherever you
      // pressed play), and in that case nothing triggers an automatic load.
      // With peaks it draws without touching the network; without them it
      // falls back to decoding the file, exactly as the player bar does.
      ws.load(url, channels).catch(() => {});
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- creation guarded by wsRef.current; recoloring handled by the effect below
  }, [current, audioElement, peaks]);

  // Recolor if the palette resolves (or changes) after wavesurfer already
  // exists — e.g. a cover-derived accent arriving late.
  useEffect(() => {
    wsRef.current?.setOptions({ waveColor, progressColor });
  }, [waveColor, progressColor]);

  useEffect(
    () => () => {
      wsRef.current?.destroy();
      wsRef.current = null;
    },
    []
  );

  return <div ref={containerRef} className={styles.wave} />;
}
