"use client";

import { useEffect, useState } from "react";

/**
 * Durations are not stored in Supabase (step 1), so they are resolved
 * client-side by preloading audio metadata. Results are cached per URL and
 * requests run through a small queue to avoid opening every connection at
 * once.
 */

const cache = new Map<string, Promise<number>>();

const MAX_CONCURRENT = 4;
let active = 0;
const queue: Array<() => void> = [];

function next() {
  if (active >= MAX_CONCURRENT) return;
  const run = queue.shift();
  if (run) run();
}

function loadDuration(url: string): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const start = () => {
      active++;
      const audio = new Audio();
      audio.preload = "metadata";
      const done = (fn: () => void) => {
        active--;
        fn();
        audio.src = "";
        next();
      };
      audio.addEventListener("loadedmetadata", () => {
        const duration = audio.duration;
        done(() => resolve(duration));
      });
      audio.addEventListener("error", () =>
        done(() => reject(new Error(`Could not load metadata for ${url}`)))
      );
      audio.src = url;
    };
    queue.push(start);
    next();
  });
}

export function getDuration(url: string): Promise<number> {
  let promise = cache.get(url);
  if (!promise) {
    promise = loadDuration(url);
    promise.catch(() => cache.delete(url));
    cache.set(url, promise);
  }
  return promise;
}

export function useDuration(url: string | null): number | null {
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    getDuration(url).then(
      (seconds) => {
        if (!cancelled) setDuration(seconds);
      },
      () => {}
    );
    return () => {
      cancelled = true;
    };
  }, [url]);

  return duration;
}

/** Total duration in seconds across urls, or null while any is unresolved. */
export function useTotalDuration(urls: Array<string | null>): number | null {
  const [total, setTotal] = useState<number | null>(null);

  const key = urls.filter(Boolean).join("|");

  useEffect(() => {
    const playable = key === "" ? [] : key.split("|");
    if (playable.length === 0) return;
    let cancelled = false;
    Promise.all(playable.map((url) => getDuration(url))).then(
      (durations) => {
        if (!cancelled) setTotal(durations.reduce((sum, d) => sum + d, 0));
      },
      () => {}
    );
    return () => {
      cancelled = true;
    };
  }, [key]);

  return total;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
