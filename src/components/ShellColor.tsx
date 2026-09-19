"use client";

import { useEffect } from "react";
import { getPalette } from "@/lib/palettes";
import { useAlbumPalette, type AlbumColorSource } from "@/lib/albumPalette";

type Props = {
  album: AlbumColorSource;
};

/**
 * Paints the page background with the album's own near-black, on the routes
 * that belong to a single album.
 *
 * It overrides `--bg` rather than introducing a variable of its own, so the
 * body background follows and so does everything already blending against it —
 * the vinyl gradient, the standalone-track wash, the account-menu scrim. No
 * surface is left compositing against the wrong black.
 *
 * Two halves, because the palette resolves in two stages. The `<style>`
 * element carries the server-resolved theme, so the colour ships in the HTML
 * and the first paint is already right. The effect then writes the
 * cover-derived shade — a browser measurement, so it can only land after
 * hydration — as an inline property, which beats the stylesheet rule on
 * specificity. `body` transitions `background-color`, so that late change
 * reads as a fade rather than a flash.
 *
 * Leaving the page unmounts the `<style>` and drops the inline property, and
 * `--bg` falls back to the site's own colour on its own.
 */
export default function ShellColor({ album }: Props) {
  const initial = getPalette(album).shell;
  const { shell } = useAlbumPalette(album);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--bg", shell);
    return () => {
      root.style.removeProperty("--bg");
    };
  }, [shell]);

  // The value is a hex from the theme catalog, never user input.
  return <style>{`:root{--bg:${initial}}`}</style>;
}
