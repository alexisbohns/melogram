# Per-album page background

The page background is a single fixed near-black, `--bg: #11090c`, on every
route. Album and track pages should instead sit on a background belonging to
the album's palette — the same warm-plum weight, re-hued — so moving between
albums changes the light in the room.

## Scope

Album pages (`/albums/[id]`) and track pages (`/tracks/[id]`) only. Home,
likes, profile and the artist views keep `#11090c`. Home shows many albums at
once, so any tint there would be arbitrary.

## 1. `shell`, a fourth colour per theme

`AlbumTheme.palette` gains `shell` alongside `light`, `accent` and `deep`: the
page background the theme sits on. `AlbumPalette` gains the same field and
`paletteVars` emits it.

| theme | shell | theme | shell |
| --- | --- | --- | --- |
| amber | `#1B0E03` | iron | `#121212` |
| violet | `#140D1E` | amethyst | `#1C0715` |
| slate | `#0C1120` | forest | `#06190D` |
| brick | `#1C0909` | linen | `#1A0F11` |

The values hold today's near-black weight and spend the whole change on hue.
The page — cards, player bar, cover gradients — is built assuming near-black,
so keeping the weight means nothing downstream needs re-tuning.

Two consequences fall out of putting the colour in the catalog rather than
deriving it:

- A cover-derived palette snaps to a catalog theme (`nearestThemeKey`), so it
  inherits a shell with no new code in `albumPalette.ts`.
- A track with no album resolves to the violet `FALLBACK` and gets violet's
  shell — consistent with every other colour on that page.

Every theme must carry a shell; `THEMES` is the only place palettes are
written as literals, so adding the field is a compile-time prompt and nothing
else breaks.

## 2. Pages override `--bg`; they do not add a variable

`:root` keeps `--bg: #11090c` as the site colour. Album and track pages
override `--bg` on `:root` with the album's shell.

Overriding the existing variable rather than introducing a second one means
`body`'s background follows, and so does everything already blending against
`--bg` — the vinyl gradient (`lib/vinyl.tsx`), the standalone-track wash, the
account-menu scrim. No component is left compositing against the wrong black.

### `ShellColor`

One client component, rendered by both pages, does both halves. It takes the
album — on a track page, the track's album, the same one already passed to that
page's `PaletteScope`:

- It renders `<style>{":root{--bg:<shell>}"}</style>` from the
  server-resolved theme (`getPalette`), so the colour ships in the HTML and the
  first paint is already correct — no flash.
- In an effect it writes the **cover-derived** shell (`useAlbumPalette`) to
  `document.documentElement.style`, which beats the stylesheet rule on
  specificity, and removes the property on unmount.

Leaving the page unmounts the `<style>` element and `--bg` falls back to the
site colour by itself, so there is no teardown path to get wrong.

The interpolated value is always a hex string from our own catalog, never user
input.

### The cross-fade

`globals.css` adds to `body`:

```css
transition: background-color 800ms ease;
```

One line covering both cases: album→album navigation, and the late change when
a cover-derived palette resolves after load. The fade is kept under
`prefers-reduced-motion` — it is a colour change, not movement, and the
existing reduced-motion block only drops the button swell and the looping
shimmer.

## 3. The two surfaces that hardcode the same black

**Mobile browser chrome.** Album and track pages export `generateViewport`
returning `themeColor: getPalette(album).shell`, so the iOS/Android status bar
and address bar tint with the page. Server-resolved only: a cover-derived album
gets its fallback theme's shell here, because metadata cannot wait for a
browser measurement. `layout.tsx` keeps `#11090c` for every other route.

**Share image.** `lib/og/albumImage.tsx` already resolves `palette`. Its
`const BG = "#11090c"` becomes `palette.shell`, which flows into both the
radial gradient and the `mix()` that consume it.

## Out of scope

Home, likes, profile and artist backgrounds; deriving the shell by formula
instead of hand-picking it; any change to `light`, `accent` or `deep`.

## Verification

The repo has no test runner. Verification is:

1. `npm run lint` and `npm run build` pass.
2. `npm run dev`, then in the browser:
   - an album with a stored theme (e.g. *Bones* → violet) paints its shell on
     first load, with no flash of `#11090c`;
   - navigating album→album cross-fades over ~800ms;
   - an album with no stored theme fades from the fallback to its cover-derived
     shell after load, rather than cutting;
   - navigating to home fades back to `#11090c`;
   - the vinyl gradient and the account-menu scrim sit on the new background
     without a visible seam.
