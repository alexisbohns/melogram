"use client";

import { useEffect, useState } from "react";
import styles from "./CoverWearTuner.module.css";

/**
 * A temporary control panel for dialling in the sleeve wear layer, rendered
 * only in development.
 *
 * The wear is one texture blended over every cover, and the two numbers that
 * decide how it reads — the blend mode and the opacity — are the kind you
 * cannot pick from a spec. They have to be judged against a light cover and a
 * dark one, on the real page. So `globals.css` reads both from custom
 * properties, and this panel writes them onto `<html>`.
 *
 * `solo` answers the first question you ask when you can't see the effect:
 * is it there at all? It drops the blend to `normal` at full opacity, showing
 * the raw texture over the artwork.
 *
 * Delete this component, its stylesheet and the mount in `layout.tsx` once the
 * values are settled — the fallbacks in `globals.css` are what ships.
 */

/** The blend modes worth trying for a near-black texture with white marks. */
const BLENDS = [
  "screen",
  "lighten",
  "color-dodge",
  "overlay",
  "soft-light",
  "hard-light",
  "multiply",
  "normal",
] as const;

const DEFAULT_BLEND = "screen";
const DEFAULT_OPACITY = 0.55;

export default function CoverWearTuner() {
  const [blend, setBlend] = useState<string>(DEFAULT_BLEND);
  const [opacity, setOpacity] = useState(DEFAULT_OPACITY);
  const [solo, setSolo] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--cover-wear-blend", solo ? "normal" : blend);
    root.setProperty("--cover-wear-opacity", solo ? "1" : String(opacity));
    return () => {
      root.removeProperty("--cover-wear-blend");
      root.removeProperty("--cover-wear-opacity");
    };
  }, [blend, opacity, solo]);

  if (!open) {
    return (
      <button
        type="button"
        className={styles.reopen}
        onClick={() => setOpen(true)}
      >
        wear
      </button>
    );
  }

  const css = `mix-blend-mode: ${blend};\nopacity: ${opacity};`;

  return (
    <aside className={styles.panel} aria-label="Cover wear tuner">
      <header className={styles.head}>
        <strong>Sleeve wear</strong>
        <button type="button" onClick={() => setOpen(false)} aria-label="Hide">
          ×
        </button>
      </header>

      <label className={styles.solo}>
        <input
          type="checkbox"
          checked={solo}
          onChange={(e) => setSolo(e.target.checked)}
        />
        Solo — raw texture, no blend
      </label>

      <div className={styles.field} data-muted={solo || undefined}>
        <span className={styles.label}>Blend</span>
        <div className={styles.blends}>
          {BLENDS.map((b) => (
            <button
              key={b}
              type="button"
              disabled={solo}
              data-on={b === blend || undefined}
              onClick={() => setBlend(b)}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.field} data-muted={solo || undefined}>
        <span className={styles.label}>
          Opacity <code>{opacity.toFixed(2)}</code>
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={opacity}
          disabled={solo}
          onChange={(e) => setOpacity(Number(e.target.value))}
        />
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          onClick={() => {
            setBlend(DEFAULT_BLEND);
            setOpacity(DEFAULT_OPACITY);
            setSolo(false);
          }}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => void navigator.clipboard?.writeText(css)}
        >
          Copy CSS
        </button>
      </div>

      <pre className={styles.out}>{css}</pre>
    </aside>
  );
}
