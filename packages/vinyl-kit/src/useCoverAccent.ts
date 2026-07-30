"use client";

import { useEffect, useState } from "react";
import { extractAccent } from "./color";

export type CoverAccentStatus = "idle" | "loading" | "ready" | "error";

export type UseCoverAccentOptions = {
  /** Colour to use until (or unless) extraction succeeds. Default `#808080`. */
  fallback?: string;
  /**
   * `crossOrigin` for the sampled image. Reading pixels requires a CORS-clean
   * image, so this defaults to `"anonymous"` — the host must serve the cover
   * with a permissive `access-control-allow-origin`.
   */
  crossOrigin?: "anonymous" | "use-credentials";
  /** Square sample size the cover is drawn into before reading. Default 32. */
  sample?: number;
};

/** One extraction per URL per page load — covers reappear all over a catalog. */
const cache = new Map<string, string>();

/**
 * Read the accent colour out of a cover image.
 *
 * Server-render safe: the returned value is derived during render (the
 * fallback, or a cached hit), and canvas work happens only inside the effect —
 * so markup matches on both sides and the colour merely refines once the image
 * has loaded. Anything that can go wrong — a failed load, a CORS-tainted
 * canvas, a cover with no real colour — leaves the fallback in place and
 * reports `status: "error"`.
 */
export function useCoverAccent(
  src: string | null | undefined,
  options?: UseCoverAccentOptions
): { accent: string; status: CoverAccentStatus } {
  const fallback = options?.fallback ?? "#808080";
  const crossOrigin = options?.crossOrigin ?? "anonymous";
  const sample = options?.sample ?? 32;

  // Only the *outcome* of sampling is state, tagged with the URL it belongs to
  // so a changed `src` invalidates it during render rather than in an effect.
  const [resolved, setResolved] = useState<{
    src: string;
    accent: string | null;
  } | null>(null);

  useEffect(() => {
    if (!src || cache.has(src)) return;

    let live = true;
    const image = new Image();
    image.crossOrigin = crossOrigin;
    image.decoding = "async";

    image.onload = () => {
      if (!live) return;
      let accent: string | null = null;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = sample;
        canvas.height = sample;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(image, 0, 0, sample, sample);
          accent = extractAccent(ctx.getImageData(0, 0, sample, sample));
        }
      } catch {
        // Tainted canvas — the cover was served without CORS headers.
        accent = null;
      }
      if (accent) cache.set(src, accent);
      if (live) setResolved({ src, accent });
    };

    image.onerror = () => {
      if (live) setResolved({ src, accent: null });
    };

    image.src = src;

    return () => {
      live = false;
    };
  }, [src, crossOrigin, sample]);

  if (!src) return { accent: fallback, status: "idle" };

  const cached = cache.get(src);
  if (cached) return { accent: cached, status: "ready" };

  if (resolved?.src === src) {
    return resolved.accent
      ? { accent: resolved.accent, status: "ready" }
      : { accent: fallback, status: "error" };
  }

  return { accent: fallback, status: "loading" };
}
