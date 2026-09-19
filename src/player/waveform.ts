/**
 * The floating player bar and the track page's song visualizer both draw the
 * same waveform — the player bar live against wavesurfer.js, the visualizer
 * from stored peaks onto its own idle canvas. Sharing this renderer (rather
 * than each keeping its own copy) is what keeps the two waveforms from
 * drifting apart.
 */

/** Rounded-pill bar width, in px, shared by every waveform in the app. */
export const WAVE_STEP = 7;

/** Rounded-pill waveform bars — carried over from the previous app's player. */
export function renderWaveform(channels: Array<Float32Array | number[]>, ctx: CanvasRenderingContext2D) {
  const { width, height } = ctx.canvas;
  const scale = channels[0].length / width;
  const step = WAVE_STEP;

  // Bars mirror around the centre line, so a full-scale value has only half
  // the canvas to fill — drawing it at `value * height` (as this did
  // originally) clipped everything above 0.5 against the edge.
  //
  // The gain is taken from the loudest bar actually sampled rather than
  // assumed, because the two sources feed very different ranges: our stored
  // peaks are max-pooled and normalised so the loudest is 1.0, while
  // wavesurfer's own decoded data is a single sample per bar and sits far
  // lower. Fitting to what's there makes both draw the same wave at the same
  // height, whichever page the listener arrived from.
  const half = height / 2;
  let loudest = 0;
  for (let i = 0; i < width; i += step * 2) {
    const sampled = Math.abs(Number(channels[0][Math.floor(i * scale)]) || 0);
    if (sampled > loudest) loudest = sampled;
  }
  const gain = loudest > 0 ? half / loudest : 0;

  ctx.translate(0, height / 2);
  ctx.strokeStyle = ctx.fillStyle as string;
  ctx.beginPath();

  for (let i = 0; i < width; i += step * 2) {
    const index = Math.floor(i * scale);
    const value = Math.abs(Number(channels[0][index]) || 0);
    let x = i;
    let y = value * gain;

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

export function alpha(hex: string, fraction: number): string {
  const a = Math.round(fraction * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}
