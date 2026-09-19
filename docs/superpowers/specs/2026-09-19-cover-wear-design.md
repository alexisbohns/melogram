# Sleeve wear on album covers

Album covers render flat: the artwork, a paper grain, and nothing else. A real
sleeve has been handled, and the record inside has pressed its own circle into
the card — the ring wear you can read across a shelf from a metre away. This
adds that second texture, so a cover reads as an object rather than an image.

## The two textures

vinyl-kit's `VinylSleeve` already carries one texture layer,
`.vk-sleeve-texture`, pointed at `/cover-texture.png` and blended with
`multiply` at opacity 0.6. That is the paper grain: a mid-grey image that
darkens the artwork unevenly.

The wear is its opposite. The source is near-black, carrying a bright ring
where the record has rubbed the card, plus scratches and a scuffed edge — so
the blend that suits it is `screen`: black leaves the artwork untouched and
only the light marks survive. Grain darkens, wear lightens; together they are
the usual recipe for a worn sleeve, and neither can do the other's job.

The ring is centred and roughly square-filling, which is why the texture can be
shared by every cover without looking pasted on: it lands where the record
would have sat whatever the artwork underneath.

## Scope

Every sleeve, everywhere the `VinylSleeve` renders: the album page hero, the
card grid, the switcher, the track hero. A sleeve is a worn object wherever it
appears, and an album that looked handled on its own page but pristine on its
card would read as two different objects.

The player bar's disc is a bare `Vinyl` with no sleeve, so it is untouched.

Every sleeve gets the same scuff pattern. Varying it per album — a rotation or
flip keyed off the album id — was considered and dropped: it buys realism only
in a dense grid, and costs a per-album custom property threaded through a
package component that has no slot for one.

## 1. The asset

`public/cover-wear.webp`, 560px square at WebP q60, converted from the 1024px
source JPG (699 KB → 37 KB). It sits beside `cover-texture.png`, and the name
separates the two jobs: grain and wear.

560px is sized against the largest sleeve the site renders — 165 CSS px, in
`TrackHero` and `AlbumDetailCard` — which leaves headroom past 3x DPR. The
layer is a texture, not artwork, so it is sized against where it is drawn
rather than against the source.

Quality stops at q60, and the file is not denoised. Pushing further down
(q50 with a 0.7px blur) does reach 16 KB, but the compressor turns this
texture's fine grain into visible blocking and the ring goes blotchy — an
optimisation that costs the thing being optimised.

## 2. The layer

One rule in `src/app/globals.css`:

```css
.vk-sleeve-cover::after {
  content: "";
  position: absolute;
  inset: 0;
  background: url("/cover-wear.webp") center / cover;
  mix-blend-mode: screen;
  opacity: 0.55;
  pointer-events: none;
}
```

A pseudo-element on vinyl-kit's own class, rather than a second layer passed
into the component, for three reasons:

- `VinylSleeve` takes a single `textureUrl` and no children, so there is no
  slot for a second texture short of forking the package.
- `::after` on `.vk-sleeve-cover` inherits the cover's asymmetric border
  radius, its `overflow: hidden` and its active-state tilt for free. A sibling
  overlay would have to restate all three and drift when they change.
- `.vk-sleeve-cover` declares a `transform`, so it is already its own stacking
  context. The blend is contained to the cover and can never composite against
  the page behind it.

This is the app's first override of a vinyl-kit class, so the rule carries a
comment saying why it lives here rather than in the package.

## 3. The share images

`renderCover` in `src/lib/og/albumImage.tsx` composites the grain server-side
with sharp so a shared link matches the page it points at. The wear follows the
same path — prepared like the grain, then a second composite:

```ts
.composite([
  { input: texture, blend: "multiply" },
  { input: wear, blend: "screen" },
])
```

Order matters: grain darkens first, wear lightens over it, which is the order
the browser paints them.

## Verification

`npm run build` and lint, then the album page and the card grid in the browser,
so the opacity is judged against a light cover and a dark one rather than
guessed. 0.55 is a starting value and expected to move.
