"use client";

import { useEffect, useRef } from "react";
import { toPlayerTrack, usePlayer } from "@/player/PlayerProvider";
import { useAlbumPalette } from "@/lib/albumPalette";
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
 * The track page's transport — the only place to play on that page. A play
 * button, the song's waveform, and a duration.
 *
 * The wave is drawn straight onto a canvas from the track's stored peaks,
 * with no wavesurfer instance, whether or not this track is the one playing.
 * That is deliberate, and it is the second design this component has had.
 *
 * Attaching a second wavesurfer to the provider's shared <audio> element —
 * which is what a "live" mode did — turned out to be a bug factory. The
 * constructor auto-loads from `options.url || getSrc()`, and `getSrc()` is
 * `media.currentSrc || media.src`, where `currentSrc` still holds the
 * PREVIOUS track's URL until the browser's resource selection catches up. So
 * pressing play captured a stale URL, and the queued load then reassigned
 * `media.src` — a fresh load that aborted the in-flight play() with
 * "The play() request was interrupted by a new load request."
 *
 * Drawing it ourselves removes that whole class of problem: one wavesurfer in
 * the app (PlayerBar's, which owns the shared element), no second loader
 * racing it, and the wave is identical whether the song is playing or not
 * because it is literally the same drawing code.
 */
export default function SongVisualizer({ track, lyrics }: Props) {
  const player = usePlayer();
  const locale = useLocale();
  const live = player.current?.id === track.track_id;
  const playing = live && player.isPlaying;
  const playable = Boolean(track.latest_resource_url);
  const peaks = track.peaks ?? null;

  // Resolved independently of the page's PaletteScope, same as PlayerBar: the
  // custom properties PaletteScope sets aren't readable from JS, and the
  // canvas needs real hex values to paint with.
  const palette = useAlbumPalette({
    id: track.album_id ?? undefined,
    name: track.album_name ?? undefined,
    theme: track.album_theme ?? undefined,
    coverUrl: track.album_cover_url,
  });

  // How much of the wave is behind us. Only meaningful while this track is the
  // one playing; an idle wave is drawn entirely in the unplayed colour.
  const progress =
    live && player.duration > 0
      ? Math.min(1, Math.max(0, player.time / player.duration))
      : 0;

  const onPlayClick = () => {
    if (!playable) return;
    if (live) {
      player.toggle();
      return;
    }
    player.playFrom([toPlayerTrack(track, lyrics, locale)], 0);
  };

  // Clicking the wave seeks while the track is playing, and starts it
  // otherwise — the same two behaviours the player bar's waveform has.
  const onWaveClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!live) {
      onPlayClick();
      return;
    }
    if (player.duration <= 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width <= 0) return;
    const fraction = (event.clientX - bounds.left) / bounds.width;
    player.seek(Math.min(1, Math.max(0, fraction)) * player.duration);
  };

  return (
    <div className={styles.visualizer}>
      <PlayButton
        playing={playing}
        disabled={!playable}
        label={playing ? `Pause ${track.track_name}` : `Play ${track.track_name}`}
        onClick={onPlayClick}
      />

      <Wave
        peaks={peaks}
        waveColor={alpha(palette.accent, 0.4)}
        progressColor={palette.light}
        progress={progress}
        onClick={onWaveClick}
      />

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
 * The waveform itself: the stored peaks painted in the unplayed colour, then
 * repainted in the played colour clipped to the progress point. Both passes go
 * through the same {@link renderWaveform} the player bar hands wavesurfer, so
 * the two waveforms in the app cannot drift apart.
 */
function Wave({
  peaks,
  waveColor,
  progressColor,
  progress,
  onClick,
}: {
  peaks: number[] | null;
  waveColor: string;
  progressColor: string;
  progress: number;
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
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
      // Match wavesurfer's own canvas sizing (renderer.js `renderSingleCanvas`):
      // the backing buffer is CSS size × device pixel ratio, the CSS size stays
      // as-is, and the render function draws against `ctx.canvas.width/height`
      // in that device-pixel space rather than through a scaled context.
      // Calling `ctx.scale(dpr, dpr)` on top would double-scale the wave.
      const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = waveColor;
      renderWaveform([peaks], ctx);

      if (progress > 0) {
        // Same wave again in the played colour, clipped to where we are. The
        // context was translated by the pass above, so it is reset first.
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, canvas.width * progress, canvas.height);
        ctx.clip();
        ctx.fillStyle = progressColor;
        renderWaveform([peaks], ctx);
        ctx.restore();
      }
    };

    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(container);
    return () => observer.disconnect();
  }, [peaks, waveColor, progressColor, progress]);

  // A version the backfill couldn't decode has no peaks: hold the same height
  // so the transport doesn't jump, but draw nothing rather than a fake wave.
  if (!peaks) return <div className={styles.wave} />;

  return (
    <div className={styles.wave} onClick={onClick} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
