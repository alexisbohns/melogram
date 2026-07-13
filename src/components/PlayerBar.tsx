"use client";

import { useEffect, useRef, useState } from "react";
import {
  Pause,
  Play,
  Repeat,
  Repeat1,
  SkipBack,
  SkipForward,
} from "lucide-react";
import type WaveSurfer from "wavesurfer.js";
import { getPalette, paletteVars } from "@/lib/palettes";
import { formatTime } from "@/player/durations";
import { usePlayer } from "@/player/PlayerProvider";
import VinylDisc from "./VinylDisc";
import styles from "./PlayerBar.module.css";

/** Rounded-pill waveform bars — carried over from the previous app's player. */
function renderWaveform(channels: Array<Float32Array | number[]>, ctx: CanvasRenderingContext2D) {
  const { width, height } = ctx.canvas;
  const scale = channels[0].length / width;
  const step = 7;

  ctx.translate(0, height / 2);
  ctx.strokeStyle = ctx.fillStyle as string;
  ctx.beginPath();

  for (let i = 0; i < width; i += step * 2) {
    const index = Math.floor(i * scale);
    const value = Math.abs(Number(channels[0][index]) || 0);
    let x = i;
    let y = value * height;

    ctx.moveTo(x, 0);
    ctx.lineTo(x, y);
    ctx.arc(x + step / 2, y, step / 2, Math.PI, 0, true);
    ctx.lineTo(x + step, 0);

    x = x + step;
    y = -y;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, y);
    ctx.arc(x + step / 2, y, step / 2, Math.PI, 0, false);
    ctx.lineTo(x + step, 0);
  }

  ctx.stroke();
  ctx.closePath();
}

function alpha(hex: string, fraction: number): string {
  const a = Math.round(fraction * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

export default function PlayerBar() {
  const player = usePlayer();
  const { current, isPlaying, repeat, time, duration } = player;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const loadedUrl = useRef<string | null>(null);
  const [wsReady, setWsReady] = useState(false);

  // the seek callback changes identity across renders; the wavesurfer
  // 'interaction' handler is registered once, so it reads through a ref
  const seekRef = useRef(player.seek);
  useEffect(() => {
    seekRef.current = player.seek;
  }, [player.seek]);

  const palette = current
    ? getPalette({
        id: current.albumId ?? "",
        name: current.albumName ?? "",
        theme: current.theme,
      })
    : null;

  // Create the render-only wavesurfer on first playback. Playback stays on
  // the provider's Audio element; wavesurfer only decodes + draws the file
  // and reports scrub interactions.
  useEffect(() => {
    if (!current || wsRef.current || !containerRef.current) return;
    let cancelled = false;
    import("wavesurfer.js").then(({ default: WS }) => {
      if (cancelled || wsRef.current || !containerRef.current) return;
      const ws = WS.create({
        container: containerRef.current,
        height: 32,
        interact: true,
        dragToSeek: true,
        cursorWidth: 0,
        renderFunction: renderWaveform,
      });
      ws.setVolume(0);
      ws.on("interaction", (newTime: number) => seekRef.current(newTime));
      wsRef.current = ws;
      setWsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [current]);

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
    const trackPalette = getPalette({
      id: current.albumId ?? "",
      name: current.albumName ?? "",
      theme: current.theme,
    });
    ws.setOptions({
      waveColor: alpha(trackPalette.accent, 0.4),
      progressColor: trackPalette.light,
    });
    if (loadedUrl.current !== current.url) {
      loadedUrl.current = current.url;
      ws.load(current.url).catch(() => {});
    }
  }, [wsReady, current]);

  // Follow playback progress with the waveform cursor.
  useEffect(() => {
    wsRef.current?.setTime(time);
  }, [time]);

  return (
    <div
      className={styles.bar}
      data-player-visible={current ? "true" : "false"}
      aria-hidden={current ? undefined : true}
      style={palette ? paletteVars(palette) : undefined}
    >
      <div className={styles.inner}>
        <div className={styles.meta}>
          <div className={styles.disc} data-playing={isPlaying ? "true" : "false"}>
            <VinylDisc coverUrl={current?.coverUrl ?? null} size={48} />
          </div>
          <div className={styles.titles}>
            <span className={styles.trackName}>{current?.name}</span>
            <span className={styles.albumName}>{current?.albumName}</span>
          </div>
        </div>

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
            className={styles.controlButton}
            aria-label="Previous track"
            onClick={player.previous}
          >
            <SkipBack size={20} strokeWidth={2} />
          </button>
          <button
            type="button"
            className={styles.playButton}
            data-playing={isPlaying ? "true" : "false"}
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
            className={styles.controlButton}
            aria-label="Next track"
            onClick={player.next}
          >
            <SkipForward size={20} strokeWidth={2} />
          </button>
          <button
            type="button"
            className={`${styles.controlButton} ${
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
    </div>
  );
}
