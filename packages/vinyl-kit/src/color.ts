/**
 * Colour maths for vinyl-kit. Deliberately DOM-free: these functions take raw
 * pixel bytes and plain hex strings, so they run in a browser, in a Node
 * server renderer, and in unit tests alike.
 */

export type Rgb = { r: number; g: number; b: number };

/** Anything with RGBA bytes in row order — `ImageData`, or a plain object. */
export type PixelSource = {
  data: Uint8ClampedArray | Uint8Array | number[];
};

/** Parse `#rgb` / `#rrggbb` (with or without the hash). Null when unparseable. */
export function hexToRgb(hex: string): Rgb | null {
  const clean = hex.trim().replace(/^#/, "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Format as `#rrggbb`, clamping and rounding each channel. */
export function rgbToHex({ r, g, b }: Rgb): string {
  const channel = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/** HSL saturation and lightness of an RGB triplet, both 0–1. */
export function saturationLightness({ r, g, b }: Rgb): {
  saturation: number;
  lightness: number;
} {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const lightness = (max + min) / 2;
  const delta = max - min;
  const saturation =
    delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1) || 1);
  return { saturation, lightness };
}

/**
 * Pick the colour a cover "reads as" — its accent.
 *
 * A plain average of an album cover is almost always mud: dark backgrounds and
 * washed-out highlights dominate by sheer pixel count. So each pixel is
 * weighted toward what the eye actually latches onto — saturated, mid-lightness
 * colour — and near-black, near-white and grey pixels contribute little:
 *
 *   weight = saturation^1.5 × (1 − min(1, |lightness − 0.5| × 1.8))
 *
 * Fully transparent and near-transparent pixels are skipped entirely. If an
 * image has no meaningful colour at all (a greyscale or near-black cover), the
 * weights collapse and we fall back to the plain average so the caller still
 * gets a usable tint rather than nothing.
 *
 * Returns `#rrggbb`, or null when there are no opaque pixels to judge.
 */
export function extractAccent(
  image: PixelSource,
  options?: { minAlpha?: number }
): string | null {
  const minAlpha = options?.minAlpha ?? 128;
  const bytes = image.data;

  const weighted = { r: 0, g: 0, b: 0 };
  const plain = { r: 0, g: 0, b: 0 };
  let totalWeight = 0;
  let opaqueCount = 0;

  for (let i = 0; i + 3 < bytes.length; i += 4) {
    const alpha = Number(bytes[i + 3]);
    if (alpha < minAlpha) continue;

    const pixel = {
      r: Number(bytes[i]),
      g: Number(bytes[i + 1]),
      b: Number(bytes[i + 2]),
    };
    opaqueCount += 1;
    plain.r += pixel.r;
    plain.g += pixel.g;
    plain.b += pixel.b;

    const { saturation, lightness } = saturationLightness(pixel);
    const weight =
      Math.pow(saturation, 1.5) *
      (1 - Math.min(1, Math.abs(lightness - 0.5) * 1.8));
    if (weight <= 0) continue;

    weighted.r += pixel.r * weight;
    weighted.g += pixel.g * weight;
    weighted.b += pixel.b * weight;
    totalWeight += weight;
  }

  if (opaqueCount === 0) return null;

  // Too little chroma to trust the weighting — use the plain average instead.
  if (totalWeight < opaqueCount * 0.01) {
    return rgbToHex({
      r: plain.r / opaqueCount,
      g: plain.g / opaqueCount,
      b: plain.b / opaqueCount,
    });
  }

  return rgbToHex({
    r: weighted.r / totalWeight,
    g: weighted.g / totalWeight,
    b: weighted.b / totalWeight,
  });
}

/**
 * Perceptual distance between two colours, using the "redmean" approximation —
 * a cheap, surprisingly good stand-in for a full CIELAB ΔE, and far better than
 * naive RGB distance at matching how different two colours *look*.
 * See https://www.compuphase.com/cmetric.htm
 */
export function colorDistance(a: Rgb, b: Rgb): number {
  const redmean = (a.r + b.r) / 2;
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(
    (2 + redmean / 256) * dr * dr +
      4 * dg * dg +
      (2 + (255 - redmean) / 256) * db * db
  );
}

/**
 * Index of the candidate closest to `target` — for snapping an extracted cover
 * colour onto a fixed design palette. Returns 0 for an empty candidate list or
 * an unparseable target, so callers can index safely.
 */
export function nearestColor(candidates: string[], target: string): number {
  const goal = hexToRgb(target);
  if (!goal || candidates.length === 0) return 0;

  let best = 0;
  let bestDistance = Infinity;
  candidates.forEach((candidate, index) => {
    const rgb = hexToRgb(candidate);
    if (!rgb) return;
    const distance = colorDistance(rgb, goal);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
}
