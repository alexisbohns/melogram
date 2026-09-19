# Per-Album Page Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give album and track pages a page background drawn from the album's palette, cross-fading as you move between them, instead of the one fixed near-black every route shares today.

**Architecture:** Each theme in the catalog gains a fourth hand-picked colour, `shell`. Album and track pages render a client component, `ShellColor`, which overrides the existing `--bg` custom property on `:root` — first via a server-rendered `<style>` element (so the first paint is right), then via an inline property on `document.documentElement` once the cover-derived palette resolves in the browser. Because the pages override `--bg` rather than adding a new variable, `body`'s background and every existing `color-mix(... var(--bg))` follow for free. An 800ms `background-color` transition on `body` turns every change into a fade.

**Tech Stack:** Next.js 16 App Router (React 19, server + client components), CSS custom properties, CSS Modules.

**Spec:** `docs/superpowers/specs/2026-09-19-per-album-page-background-design.md`

**Note on testing:** this repo has no test runner and no test files — `package.json` exposes only `dev`, `build`, `lint`. Verification is therefore `npx tsc --noEmit`, `npm run lint`, `npm run build`, plus the scripted browser walkthrough in Task 7. Each task states its own check.

---

## File Structure

| File | Change | Responsibility |
| --- | --- | --- |
| `src/lib/palettes.ts` | Modify | Add `shell` to `AlbumTheme.palette`, `AlbumPalette` and all eight `THEMES` entries. |
| `src/components/ShellColor.tsx` | Create | The only thing that writes the page background. Server-rendered `<style>` + client refinement effect. |
| `src/app/globals.css` | Modify | Add the `background-color` transition to `body`. |
| `src/app/albums/[id]/page.tsx` | Modify | Render `<ShellColor>`; export `generateViewport`. |
| `src/app/tracks/[id]/page.tsx` | Modify | Render `<ShellColor>`; export `generateViewport`. |
| `src/lib/og/albumImage.tsx` | Modify | Replace the `BG` constant with the resolved `palette.shell`. |

---

### Task 1: Add `shell` to the theme catalog

**Files:**
- Modify: `src/lib/palettes.ts`

- [ ] **Step 1: Add `shell` to the two palette types**

In `src/lib/palettes.ts`, the `AlbumPalette` type currently documents three colours. Add a fourth field after `deep` and before `genre`:

```ts
  /** Deep shade: times, meta tile icons. */
  deep: string;
  /**
   * The page background this palette sits on — a near-black carrying the
   * theme's hue. Album and track pages paint it over `--bg`; every other
   * route keeps the site's own `--bg`.
   */
  shell: string;
```

And in `AlbumTheme`, widen the inline palette type:

```ts
  /** The four colors this theme paints. */
  palette: { light: string; accent: string; deep: string; shell: string };
```

(Note the doc comment changes from "three colors" to "four colors".)

- [ ] **Step 2: Add the eight `shell` values to `THEMES`**

Replace the whole `THEMES` array body with these entries — the colours hold today's `#11090c` near-black weight and spend the change on hue:

```ts
export const THEMES: AlbumTheme[] = [
  {
    key: "amber",
    name: "Amber",
    palette: { light: "#F6EFE6", accent: "#A15C08", deep: "#714006", shell: "#1B0E03" },
  },
  {
    key: "violet",
    name: "Violet",
    palette: { light: "#F2EFF5", accent: "#7B5E99", deep: "#56426B", shell: "#140D1E" },
  },
  {
    key: "slate",
    name: "Slate",
    palette: { light: "#EEF0F3", accent: "#59658A", deep: "#3E4761", shell: "#0C1120" },
  },
  {
    key: "brick",
    name: "Brick",
    palette: { light: "#F4ECEC", accent: "#8E4242", deep: "#632E2E", shell: "#1C0909" },
  },
  {
    key: "iron",
    name: "Iron",
    palette: { light: "#F3F3F3", accent: "#868686", deep: "#5E5E5E", shell: "#121212" },
  },
  {
    key: "amethyst",
    name: "Amethyst",
    palette: { light: "#F6EDF3", accent: "#A9478A", deep: "#763261", shell: "#1C0715" },
  },
  {
    key: "forest",
    name: "Forest",
    palette: { light: "#EDF2EE", accent: "#487C5A", deep: "#32573F", shell: "#06190D" },
  },
  {
    key: "linen",
    name: "Linen",
    palette: { light: "#E9E2E4", accent: "#7A5E64", deep: "#4A3639", shell: "#1A0F11" },
  }
];
```

- [ ] **Step 3: Record why `paletteVars` does *not* carry the shell**

`paletteVars` is what every album-scoped subtree reads. Deliberately it does **not** emit `--bg`: the shell reaches the page through `ShellColor` at `:root`, not through a scoped subtree, so that the album rail on the album page (which wraps each sibling album in its own `PaletteScope`) does not repaint the page. Leave `paletteVars` exactly as it is, and add a line to its doc comment saying so:

```ts
/**
 * Inline CSS custom properties consumed by every album-scoped component.
 *
 * `shell` is deliberately absent: it belongs to the page, not to a subtree,
 * and is applied at `:root` by `ShellColor`. Emitting it here would let the
 * album rail — where each sibling album gets its own scope — repaint the page.
 */
export function paletteVars(palette: AlbumPalette): CSSProperties {
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no output (exit 0). `THEMES` is the only place palettes are written as literals, so nothing else should need updating. If `tsc` reports a missing `shell` anywhere else, add it there before moving on.

- [ ] **Step 5: Commit**

```bash
git add src/lib/palettes.ts
git commit -m "Give every theme a shell colour"
```

---

### Task 2: The `ShellColor` component

**Files:**
- Create: `src/components/ShellColor.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/ShellColor.tsx` with exactly this content:

```tsx
"use client";

import { useEffect } from "react";
import { getPalette } from "@/lib/palettes";
import { useAlbumPalette, type AlbumColorSource } from "@/lib/albumPalette";

type Props = {
  album: AlbumColorSource;
};

/**
 * Paints the page background with the album's own near-black, for the routes
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
 * specificity. `body` transitions `background-color`, so the late change reads
 * as a fade rather than a flash.
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
    return () => root.style.removeProperty("--bg");
  }, [shell]);

  // Values come from the theme catalog, never from user input.
  return <style>{`:root{--bg:${initial}}`}</style>;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no output (exit 0).

- [ ] **Step 3: Commit**

```bash
git add src/components/ShellColor.tsx
git commit -m "Add ShellColor, which paints a page its album's black"
```

---

### Task 3: Cross-fade the background

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add the transition to `body`**

In `src/app/globals.css`, the `body` rule currently reads:

```css
body {
  /* the header relies on mix-blend-mode: color-dodge compositing against
     this background — keep it on body, in the same stacking context */
  background: var(--bg);
  color: var(--album-light);
  font-family: var(--font-grotesk), sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

Replace it with:

```css
body {
  /* the header relies on mix-blend-mode: color-dodge compositing against
     this background — keep it on body, in the same stacking context */
  background: var(--bg);
  color: var(--album-light);
  font-family: var(--font-grotesk), sans-serif;
  -webkit-font-smoothing: antialiased;
  /* Album and track pages override `--bg` with their own near-black (see
     ShellColor). Fading it turns both moves into a change of light in the
     room: album to album, and the later switch to a cover-derived shade.
     Kept under reduced motion — it is a colour change, not movement. */
  transition: background-color 800ms ease;
}
```

- [ ] **Step 2: Verify the stylesheet still builds**

Run: `npm run build`
Expected: build completes ("Compiled successfully" / route table printed), no CSS errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "Fade the page background instead of cutting to it"
```

---

### Task 4: Wire up the album page

**Files:**
- Modify: `src/app/albums/[id]/page.tsx`

- [ ] **Step 1: Add the imports**

At the top of `src/app/albums/[id]/page.tsx`, the imports currently start with `import type { Metadata } from "next";`. Change that line and add two imports:

```tsx
import type { Metadata, Viewport } from "next";
```

and, alongside the other component imports:

```tsx
import ShellColor from "@/components/ShellColor";
```

and, next to the existing `@/lib/data` import:

```tsx
import { getPalette } from "@/lib/palettes";
```

- [ ] **Step 2: Export `generateViewport`**

Add this immediately after the existing `generateMetadata` function (which ends with the returned `{ title, description, openGraph, twitter }` object) and before `export default async function AlbumPage`:

```tsx
/**
 * Tints the mobile browser chrome and the PWA status bar with the album's own
 * background. Server-resolved only: metadata cannot wait for the cover-derived
 * measurement, so an album without a stored theme gets its fallback's shade.
 */
export async function generateViewport({ params }: Props): Promise<Viewport> {
  const { id } = await params;
  const albums = await getAlbumsWithTracks();
  const album = albums.find((a) => a.id === id);
  return { themeColor: getPalette(album ?? {}).shell };
}
```

- [ ] **Step 3: Render `ShellColor`**

In `AlbumPage`, the returned JSX currently begins:

```tsx
    <div className={styles.page}>
      <SiteLogo />
```

Change it to:

```tsx
    <div className={styles.page}>
      <ShellColor album={{ ...album, coverUrl: album.cover_url }} />
      <SiteLogo />
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: `tsc` silent; `lint` reports no errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/albums/[id]/page.tsx"
git commit -m "Paint the album page its album's black"
```

---

### Task 5: Wire up the track page

**Files:**
- Modify: `src/app/tracks/[id]/page.tsx`

- [ ] **Step 1: Add the imports**

At the top of `src/app/tracks/[id]/page.tsx`, change the first import line to:

```tsx
import type { Metadata, Viewport } from "next";
```

Add, alongside the other component imports:

```tsx
import ShellColor from "@/components/ShellColor";
```

Add, next to the other `@/lib` imports:

```tsx
import { getPalette } from "@/lib/palettes";
```

- [ ] **Step 2: Export `generateViewport`**

Add this immediately after the existing `generateMetadata` function and before `export default async function TrackPage`:

```tsx
/**
 * Tints the mobile browser chrome and the PWA status bar with the album's own
 * background. Server-resolved only: metadata cannot wait for the cover-derived
 * measurement, so an album without a stored theme gets its fallback's shade.
 */
export async function generateViewport({ params }: Props): Promise<Viewport> {
  const { id } = await params;
  const page = await getTrack(id);
  return { themeColor: getPalette(page?.album ?? {}).shell };
}
```

- [ ] **Step 3: Render `ShellColor`**

In `TrackPage`, the returned JSX currently begins:

```tsx
    <div className={styles.page}>
      <SiteLogo />
      <PaletteScope
```

Change it to:

```tsx
    <div className={styles.page}>
      <ShellColor
        album={{
          id: album?.id,
          name: album?.name,
          theme: album?.theme,
          coverUrl: track.album_cover_url,
        }}
      />
      <SiteLogo />
      <PaletteScope
```

The album shape is the same one already passed to `PaletteScope` a few lines below — a track with no album resolves to the violet fallback, matching every other colour on that page.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: `tsc` silent; `lint` reports no errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/tracks/[id]/page.tsx"
git commit -m "Paint the track page its album's black"
```

---

### Task 6: The share image

**Files:**
- Modify: `src/lib/og/albumImage.tsx`

- [ ] **Step 1: Delete the `BG` constant**

In `src/lib/og/albumImage.tsx`, remove this line (currently line 30):

```ts
const BG = "#11090c"; // --bg
```

- [ ] **Step 2: Derive `BG` from the album's palette instead**

`renderAlbumImage` already resolves the album's palette — currently line 172:

```ts
  const palette = resolvePalette(getPalette(album ?? {}), album, cover.accent);
```

Add this line immediately after it:

```ts
  // The album's own near-black, the same one its page sits on.
  const BG = palette.shell;
```

All three `BG` references live inside `renderAlbumImage` below that line, so they pick up the album's shade with no further edits: the cover-less tile's `mix(palette.accent, BG, 0.6)`, the card's `background: BG`, and its `radial-gradient(..., ${palette.deep}40, ${BG} 68%)`.

Note that `resolvePalette` may swap in a cover-derived theme, and since the shell now travels with the palette, the image's background follows that derivation too.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npm run lint`
Expected: `tsc` silent; `lint` reports no errors.

- [ ] **Step 4: Check the image actually renders**

Run: `npm run dev`, then open `http://localhost:3000/albums/<any-album-id>/opengraph-image` in a browser.
Expected: a 1200×630 card whose background is the album's shade rather than `#11090c`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/og/albumImage.tsx
git commit -m "Sit the share image on the album's own black"
```

---

### Task 7: Browser walkthrough

**Files:** none — this is the verification pass the spec calls for.

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: completes with no errors or new warnings.

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`
Expected: serving on `http://localhost:3000`.

- [ ] **Step 3: Walk the pages and confirm each of these**

Open the home page, then an album, then another album, then a track, then home again. Confirm:

1. Home is still `#11090c`.
2. An album with a stored theme (*Bones* → violet, *Dawn from the Semicolon* → amber, *Celesta* → slate) paints its shade on first load — hard-reload it and watch for a flash of `#11090c`. There should be none.
3. Navigating album → album cross-fades over roughly eight tenths of a second rather than cutting.
4. An album with no stored theme starts on the fallback and fades to its cover-derived shade shortly after load.
5. A track page carries its album's shade, and a track with no album shows violet's.
6. Navigating back to home fades back to `#11090c`.
7. The vinyl gradient behind a cover, and the account-menu scrim, sit on the new background with no visible seam or mismatched black.

- [ ] **Step 4: Check the mobile chrome colour**

In devtools, inspect `<head>` on an album page.
Expected: `<meta name="theme-color" content="#140D1E">` (or the shade matching that album's theme) rather than `#11090c`.

- [ ] **Step 5: Commit any fixes**

If any of the seven checks failed, fix it and commit. If all passed, there is nothing to commit — move on.

---

### Task 8: Open the PR

**Files:** none.

- [ ] **Step 1: Push the branch and open the PR**

This ships something a listener notices, so `CLAUDE.md` requires a Lab Note in the PR body. Use this one:

````markdown
## Lab Note

```yaml
en:
  title: Every album brings its own light
  summary: Open an album or a track and the whole page settles into that record's colour — a deep, quiet shade picked to match its artwork. Move to another one and the light in the room changes with you.
fr:
  title: Chaque album a sa propre lumière
  summary: Ouvre un album ou un morceau et toute la page prend la couleur du disque — une teinte sombre et calme, choisie pour aller avec la pochette. Passe à un autre et la lumière change avec toi.
suggested:
  molecule: melogram
  type: improvement
  tags: [changelog]
```
````

Run:

```bash
git push -u origin HEAD
gh pr create --title "Give every album page its own black" --body-file -
```

with a body containing a short summary, the Lab Note section above, and the trailer `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
