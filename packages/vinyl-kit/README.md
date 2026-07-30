# vinyl-kit

A vinyl record for the web, built from **one grayscale mask and a CSS blend
mode** — so a single 31 KB asset paints a record in any colour you like.

Records, sleeves that slide their record out when you hover them, fanned stacks,
and a hook that reads a cover's accent colour so artwork can pick its own
palette. React, zero runtime dependencies.

<!-- demo gif -->

```bash
npm install vinyl-kit
```

```tsx
import { Vinyl, VinylSleeve } from "vinyl-kit";
import "vinyl-kit/vinyl.css";

<Vinyl cover="/covers/bones.jpg" tint="#7B5E99" size={220} spinning />;
```

## Why it's built this way

Most CSS vinyl records are a stack of `radial-gradient` rings. They look like
rings. This one uses a photographic groove mask — real grooves, real
light — as a **luminance-only layer** over a flat colour fill:

1. a solid fill in the record's tint,
2. the cover art, centred in a small circle (the label),
3. the groove mask, blended with `mix-blend-mode: luminosity`.

The mask contributes lightness and nothing else, so the grooves take their hue
from the fill underneath, and the mask's transparent centre lets the label show
through. One asset, every colour, no per-album artwork.

## Features

- **`Vinyl`** — a record, optionally spinning, optionally with cover art on its
  label.
- **`VinylSleeve`** — an album sleeve with the record tucked behind it, which
  rolls out and tilts the cover when active. Driven by one inheritable custom
  property, so **hover needs no JavaScript**.
- **`VinylStack`** — a crate of records that fans wider on hover.
- **`useCoverAccent`** — samples a cover's accent colour in the browser, for
  tinting a record (or a whole page) from artwork.
- **Server-component safe** — `Vinyl`, `VinylSleeve` and `VinylStack` use no
  hooks and no event handlers, so they render on the server untouched.
- **Bring your own image component** — plain `<img>` by default, or hand it
  `next/image`, a CDN loader, anything.
- **Respects `prefers-reduced-motion`** — transitions and spin both stand down.

## Components

### `Vinyl`

```tsx
<Vinyl cover={album.cover} tint="#A15C08" size={200} spinning={isPlaying} />
```

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `cover` | `string \| null` | — | Art for the centre label; omit for a plain record |
| `tint` | `string` | `#808080` | The record's colour |
| `size` | `number` | — | Diameter in px; omit to fill the parent's width |
| `fill` | `boolean` | `false` | Fill a positioned parent instead of self-sizing |
| `spinning` | `boolean` | — | `true` spins, `false` freezes mid-revolution, omitted attaches no animation |
| `maskUrl` | `string` | bundled | Your own groove mask |
| `alt` | `string` | `""` | Label alt text — the disc is decorative by default |
| `renderImage` | `RenderImage` | plain `<img>` | See [Bring your own image component](#bring-your-own-image-component) |

`spinning={false}` pauses rather than resets: the record stops where it stopped,
like lifting the needle.

### `VinylSleeve`

```tsx
<VinylSleeve cover={album.cover} alt={album.name} size={160} active={isOpen} reserve />
```

Adds to `Vinyl`'s props:

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `size` | `number` | **required** | The square sleeve's size in px; all geometry derives from it |
| `active` | `boolean` | `false` | Slide the record out, tilt the cover |
| `reserve` | `boolean` | `false` | Reserve layout width for the extracted record |
| `textureUrl` | `string \| null` | bundled | Sleeve paper texture; `null` removes the layer |

**Hover without JavaScript.** The slide runs on `--vinyl-extract` (0 → 1), and
custom properties inherit — so any ancestor can drive it from CSS alone:

```css
.album-card:hover,
.album-card:focus-visible {
  --vinyl-extract: 1;
}
```

That's also why the extraction can be shared: the same hover can slide sibling
text out of the record's way with
`transform: translateX(calc(var(--vinyl-extract, 0) * 31px))`.

Use `reserve` wherever content sits to the right of the sleeve; without it the
record overflows its box when it comes out (which is often exactly what you
want in a grid).

### `VinylStack`

```tsx
<VinylStack size={180} items={albums.map((a) => ({ cover: a.cover, tint: a.accent }))} />
```

Item 0 sits on top and anchors the stack; the rest fan out to the right, each
one rotated a little further. Hovering spreads the fan — a transform-only move,
so nothing around it shifts.

## Theming

Everything tunable is a custom property, so you restyle from your own CSS
without touching props. Set them on the component, an ancestor, or `:root`.

| Property | Default | |
| --- | --- | --- |
| `--vinyl-tint` | `#808080` | Groove colour |
| `--vinyl-size` | — | The square cover size; all sleeve geometry derives from it |
| `--vinyl-extract` | `0` | 0 resting → 1 extracted (inheritable) |
| `--vinyl-diameter` | `0.94` | Record diameter, as a fraction of `--vinyl-size` |
| `--vinyl-peek` | `0.16` | Resting overhang past the cover's edge |
| `--vinyl-slide` | `0.46` | Extra slide when extracted |
| `--vinyl-roll` | `2.5deg` | Record rotation when extracted |
| `--vinyl-tilt` | `-2deg` | Cover tilt when extracted |
| `--vinyl-label` | `38%` | Label diameter, as a fraction of the record |
| `--vinyl-ease` | `cubic-bezier(0.22, 1, 0.36, 1)` | Slide/tilt easing |
| `--vinyl-duration` | `0.55s` | Slide/tilt duration |
| `--vinyl-spin-duration` | `5s` | One revolution |
| `--vinyl-backdrop` | tint gradient | Behind the cover art while it loads |
| `--vinyl-disc-shadow` | `0 6px 16px rgba(0,0,0,.4)` | Record shadow |
| `--vinyl-sleeve-shadow` | `0 0 10px rgba(0,0,0,.5)` | Sleeve shadow |
| `--vinyl-stack-shift` | `0.35` | Resting offset per record in a stack |
| `--vinyl-stack-shift-hover` | `0.5` | Fanned offset per record |
| `--vinyl-stack-roll` | `-2deg` | Rotation added per record |

States are data attributes, so you can style against them:
`[data-active="true"]` on the sleeve, `[data-spinning="true" \| "false"]` on the
record.

## Colour from cover art

```tsx
const { accent, status } = useCoverAccent(album.cover, { fallback: "#7B5E99" });

<Vinyl cover={album.cover} tint={accent} size={200} />;
```

A plain average of a cover is almost always mud — dark backgrounds and washed
highlights win on pixel count. So each pixel is weighted toward what the eye
actually latches onto, saturated mid-lightness colour:

```
weight = saturation^1.5 × (1 − min(1, |lightness − 0.5| × 1.8))
```

Covers with no real colour (greyscale, near-black) fall back to a plain average
rather than returning nothing.

**Reading pixels needs a CORS-clean image.** The hook sets
`crossOrigin="anonymous"`, so the host must serve covers with a permissive
`access-control-allow-origin`. If it doesn't, the canvas is tainted, `status`
becomes `"error"`, and `accent` stays your `fallback` — nothing breaks, the
colour just doesn't refine. It's server-render safe: the value is derived during
render, canvas work happens only in an effect, and each URL is sampled once per
page load.

Snapping onto a designed palette usually beats using a raw sampled colour:

```ts
import { nearestColor } from "vinyl-kit";

const themes = ["#A15C08", "#7B5E99", "#59658A", "#8E4242"];
const theme = themes[nearestColor(themes, accent)];
```

`nearestColor` uses the [redmean][redmean] approximation — cheap, and far closer
to how different two colours *look* than naive RGB distance. `extractAccent`,
`colorDistance` and the hex/RGB helpers are exported too, and they're all
DOM-free, so the same matching runs server-side (e.g. when generating share
images from a decoded cover).

[redmean]: https://www.compuphase.com/cmetric.htm

## Bring your own image component

The package renders a plain `<img>` unless you say otherwise. `renderImage`
receives `{ src, alt, sizePx }` and must fill its positioned parent — which the
stylesheet already arranges, so most adapters are one line:

```tsx
import Image from "next/image";
import type { RenderImage } from "vinyl-kit";

const renderImage: RenderImage = ({ src, alt, sizePx }) => (
  <Image src={src} alt={alt} fill sizes={sizePx ? `${sizePx}px` : undefined} />
);

<VinylSleeve cover={cover} alt={name} size={160} renderImage={renderImage} />;
```

## Next.js notes

Import the stylesheet once, in your root layout:

```tsx
// app/layout.tsx
import "vinyl-kit/vinyl.css";
```

The components are server-safe, so they drop straight into server components.
This release ships **TypeScript sources** rather than a compiled bundle, so add:

```ts
// next.config.ts
transpilePackages: ["vinyl-kit"],
```

## Bundle size

The groove mask and sleeve texture ship inlined as data URIs, so the package
works the moment you import it — at a cost of roughly **133 KB** in your JS
bundle. To serve them as files instead, copy them out of the package's
`assets/` folder and point at them:

```tsx
<VinylSleeve maskUrl="/vinyl-mask.webp" textureUrl="/cover-texture.png" … />
```

Your bundler then drops the inlined constants.

## A note on blend modes

Two details are load-bearing, and both are in `vinyl.css` with comments:

- **`isolation: isolate`** on the record contains the luminosity blend, so the
  mask composites against the record's own tint and label — never the page
  behind it.
- **`transform: translateZ(0)`** pins the record to its own compositing layer.
  Without it, an ancestor's one-shot transform *transition* (a sleeve sliding
  out) briefly promotes then demotes the record, and Android Chrome
  mis-composites the nested blend mode during that churn — the grooves lose
  their colour for a frame or two, intermittently. The spin keyframes re-declare
  the same `translateZ`, since an animated transform would otherwise replace it.

## Roadmap

- A compiled build (`tsup`) so `transpilePackages` isn't needed
- 45 rpm / 7-inch variant with the wide centre hole
- Gatefold sleeve
- A framework-free web-component wrapper

## License

MIT © [Alexis Bohns](https://bohns.design) — code and the bundled mask/texture
artwork alike, so the package is usable as a whole.
