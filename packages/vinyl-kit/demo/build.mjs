/**
 * Builds the standalone demo page.
 *
 * Everything is inlined — stylesheet, mask, texture, covers, and the *real*
 * colour code compiled straight out of `src/color.ts` — so `demo/index.html`
 * opens from the filesystem, makes no network requests, and can't drift from
 * the package it demonstrates.
 *
 *   node demo/build.mjs
 *
 * Set ARTIFACT_OUT to additionally write a body-only fragment (no <html> /
 * <head> / <body> wrapper) for hosts that supply their own document shell.
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, "..");

const css = await readFile(join(pkg, "src/vinyl.css"), "utf8");
const mask = await readFile(join(pkg, "assets/vinyl-mask.webp"));
const texture = await readFile(join(pkg, "assets/cover-texture.png"));

const maskUri = `data:image/webp;base64,${mask.toString("base64")}`;
const textureUri = `data:image/png;base64,${texture.toString("base64")}`;

/** Compile src/color.ts to an IIFE exposing `window.VinylKitColor`. */
const bundled = await build({
  entryPoints: [join(pkg, "src/color.ts")],
  bundle: true,
  format: "iife",
  globalName: "VinylKitColor",
  target: "es2019",
  write: false,
  minify: false,
});
const colorBundle = bundled.outputFiles[0].text;

/** A stand-in album cover: gradient, a bold mark, and a wash of grain. */
function makeCover({ from, to, ink, mark }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
    </linearGradient>
    <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3"/>
      <feColorMatrix type="saturate" values="0"/></filter>
  </defs>
  <rect width="400" height="400" fill="url(#g)"/>
  ${mark(ink)}
  <rect width="400" height="400" filter="url(#n)" opacity="0.14"/>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

const covers = [
  makeCover({
    from: "#C97416",
    to: "#3A1C05",
    ink: "#F6EFE6",
    mark: (ink) =>
      `<circle cx="200" cy="185" r="86" fill="none" stroke="${ink}" stroke-width="10" opacity="0.9"/>
       <path d="M118 300h164" stroke="${ink}" stroke-width="10" opacity="0.65"/>`,
  }),
  makeCover({
    from: "#8E6BB0",
    to: "#241733",
    ink: "#F2EFF5",
    mark: (ink) =>
      `<path d="M200 96l92 168H108z" fill="none" stroke="${ink}" stroke-width="10" opacity="0.9"/>
       <circle cx="200" cy="212" r="24" fill="${ink}" opacity="0.55"/>`,
  }),
  makeCover({
    from: "#5C79B8",
    to: "#141B2E",
    ink: "#EEF0F3",
    mark: (ink) =>
      `<rect x="120" y="120" width="160" height="160" fill="none" stroke="${ink}" stroke-width="10" opacity="0.85"/>
       <path d="M120 200h160M200 120v160" stroke="${ink}" stroke-width="6" opacity="0.5"/>`,
  }),
  makeCover({
    from: "#B34B4B",
    to: "#2E0F0F",
    ink: "#F4ECEC",
    mark: (ink) =>
      `<path d="M110 270c40-120 140-120 180 0" fill="none" stroke="${ink}" stroke-width="12" opacity="0.9"/>
       <circle cx="200" cy="140" r="18" fill="${ink}" opacity="0.6"/>`,
  }),
];

const TINTS = ["#A15C08", "#7B5E99", "#59658A", "#8E4242"];

/** The catalog a sampled colour gets snapped onto (Melogram's themes). */
const THEMES = [
  ["Amber", "#A15C08"],
  ["Violet", "#7B5E99"],
  ["Slate", "#59658A"],
  ["Brick", "#8E4242"],
  ["Iron", "#868686"],
  ["Amethyst", "#A9478A"],
  ["Forest", "#487C5A"],
  ["Linen", "#7A5E64"],
];

/**
 * The DOM the React components render — mirrored here by hand, with one
 * deliberate difference: the groove mask and sleeve texture are painted from a
 * `background-image` fed by a custom property set once on `:root`, rather than
 * repeating their data URIs in 14 `<img>` tags (which quintupled this file).
 * The components use an `<img>` for the mask so hosts can swap in their own
 * image component; the CSS sizing is identical either way.
 */
function disc({ cover, tint, spinning, fill, sizePx, label }) {
  const styles = [tint ? `--vinyl-tint:${tint}` : "", sizePx ? `--vinyl-size:${sizePx}px;width:${sizePx}px;height:${sizePx}px` : ""]
    .filter(Boolean)
    .join(";");
  return `<div class="vk-disc${fill ? " vk-disc--fill" : ""}"${
    spinning === undefined ? "" : ` data-spinning="${spinning}"`
  }${styles ? ` style="${styles}"` : ""}${label ? ` id="${label}"` : ""}>
      <div class="vk-disc-color"></div>
      ${cover ? `<div class="vk-disc-label"><img src="${cover}" alt=""></div>` : ""}
      <div class="vk-disc-mask demo-mask" aria-hidden="true"></div>
    </div>`;
}

function sleeve({ cover, tint, size, active, reserve, extra = "" }) {
  return `<div class="vk-sleeve${reserve ? " vk-sleeve--reserve" : ""}" data-active="${active}"
     style="--vinyl-size:${size}px;--vinyl-tint:${tint}"${extra}>
      <div class="vk-sleeve-vinyl">${disc({ cover, fill: true })}</div>
      <div class="vk-sleeve-cover">
        <img src="${cover}" alt="">
        <div class="vk-sleeve-texture demo-texture" aria-hidden="true"></div>
      </div>
    </div>`;
}

const stackItems = covers
  .map(
    (cover, i) =>
      `<div class="vk-stack-item" style="--vk-i:${i};z-index:${covers.length - i}">${disc(
        { cover, tint: TINTS[i], fill: true }
      )}</div>`
  )
  .join("\n      ");

const pageCss = `
/* The two bundled assets, stored once and reused by every record on the page. */
:root {
  --demo-mask: url(${maskUri});
  --demo-texture: url(${textureUri});
  color-scheme: dark;
}
.demo-mask { background: var(--demo-mask) center / cover; }
.demo-texture { background: var(--demo-texture) center / cover; }
* { box-sizing: border-box; }
body {
  margin: 0;
  background: #11090c;
  background-image: radial-gradient(900px 600px at 20% -10%, #2a1420, #11090c 70%);
  color: #efe6ea;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  line-height: 1.55;
  padding: 0 24px 96px;
}
.wrap { max-width: 1040px; margin: 0 auto; }
header { padding: 76px 0 24px; }
.hero {
  display: flex; align-items: center; gap: clamp(28px, 6vw, 76px);
  flex-wrap: wrap-reverse; justify-content: space-between;
}
.hero-text { flex: 1 1 380px; }
.hero-record { flex: 0 0 auto; }
/* The hero record turns slowly — it is the thesis of the page, not decoration. */
#hero-disc { --vinyl-spin-duration: 14s; }
h1 {
  font-family: ui-serif, Georgia, "Times New Roman", serif;
  font-weight: 400;
  font-size: clamp(44px, 8vw, 84px);
  line-height: 1.02;
  margin: 0 0 18px;
  letter-spacing: -0.01em;
}
.tagline { font-size: clamp(17px, 2.4vw, 21px); color: #cbb9c2; max-width: 60ch; margin: 0 0 26px; }
code, pre { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; }
.install {
  display: inline-block; padding: 11px 16px; border-radius: 10px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  font-size: 14px; color: #f3e9ee;
}
.note {
  margin: 30px 0 0; padding: 14px 16px; border-radius: 10px; font-size: 14px;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: #c6b4bd; max-width: 78ch;
}
section { padding: 64px 0 0; border-top: 1px solid rgba(255,255,255,0.08); margin-top: 64px; }
h2 {
  font-family: ui-serif, Georgia, serif; font-weight: 400;
  font-size: clamp(26px, 4vw, 38px); margin: 0 0 10px;
}
.lede { color: #c6b4bd; margin: 0 0 32px; max-width: 68ch; }
.row { display: flex; flex-wrap: wrap; gap: 44px; align-items: center; }
.stage { padding: 28px 0; }
figure { margin: 0; }
figcaption { margin-top: 14px; font-size: 13px; color: #a8949d; }
button {
  font: inherit; font-size: 14px; cursor: pointer; color: #f3e9ee;
  padding: 9px 15px; border-radius: 999px;
  background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.16);
}
button:hover { background: rgba(255,255,255,0.14); }
.controls { display: flex; gap: 12px; align-items: center; margin-top: 26px; flex-wrap: wrap; }
.hint { font-size: 13px; color: #a8949d; }
.card {
  padding: 26px 22px; border-radius: 16px; width: 232px;
  background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.08);
  display: flex; flex-direction: column; align-items: center; gap: 18px;
  transition: background 0.2s ease;
}
.card:hover { background: rgba(255,255,255,0.07); }
/* The whole point: hover is CSS, not JavaScript. */
.card:hover, .card:focus-within { --vinyl-extract: 1; }
.card h3 { font-family: ui-serif, Georgia, serif; font-weight: 400; font-size: 21px; margin: 0; }
.card p { margin: 0; font-size: 13px; color: #b4a1aa; text-align: center; }
.swatches { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
.swatch {
  display: flex; align-items: center; gap: 8px; padding: 7px 11px 7px 8px;
  border-radius: 999px; font-size: 12px; color: #d9ccd3;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
}
.swatch[data-match="true"] { border-color: rgba(255,255,255,0.5); color: #fff; }
.swatch i { width: 15px; height: 15px; border-radius: 50%; display: block; }
.readout { font-size: 14px; color: #cbb9c2; margin-top: 18px; }
.readout b { color: #fff; font-weight: 500; font-family: ui-monospace, Menlo, monospace; }
.covers { display: flex; gap: 14px; flex-wrap: wrap; }
.covers img { width: 76px; height: 76px; border-radius: 6px; cursor: pointer; border: 2px solid transparent; }
.covers img[aria-pressed="true"] { border-color: #fff; }
footer { margin-top: 80px; font-size: 13px; color: #9d8992; }
a { color: #e9b3c9; }
@media (max-width: 640px) { .row { gap: 32px; } }
`;

const body = `
<div class="wrap">
  <header>
    <div class="hero">
      <div class="hero-text">
        <h1>vinyl-kit</h1>
        <p class="tagline">
          A vinyl record for the web, built from <strong>one grayscale mask and a
          CSS blend mode</strong> — so a single 31&nbsp;KB asset paints a record
          in any colour you like. Records, sleeves that slide open, fanned
          stacks, and colour read straight from cover art.
        </p>
        <span class="install">npm install vinyl-kit</span>
      </div>
      <div class="hero-record">
        ${disc({ cover: covers[1], tint: TINTS[1], sizePx: 300, spinning: true, label: "hero-disc" })}
      </div>
    </div>
    <p class="note">
      Every record on this page is that same mask over a different colour fill.
      The markup is hand-written to mirror exactly what the React components
      render — same class names, same data attributes — so what you see is the
      CSS contract, with no framework in the way.
    </p>
  </header>

  <section>
    <h2>The record</h2>
    <p class="lede">
      Three layers inside a blend-isolated circle: a colour fill, the cover art
      as a centre label, and the groove mask blended with
      <code>mix-blend-mode: luminosity</code> — contributing lightness and
      nothing else, so the grooves take their hue from the fill underneath.
    </p>
    <div class="row stage">
      ${covers
        .map((cover, i) =>
          `<figure>${disc({ cover, tint: TINTS[i], sizePx: 168 })}
        <figcaption><code>tint="${TINTS[i]}"</code></figcaption></figure>`
        )
        .join("\n      ")}
      <figure>${disc({ tint: "#2f2f33", sizePx: 168 })}
        <figcaption>No cover — just a record</figcaption></figure>
    </div>
  </section>

  <section>
    <h2>The sleeve</h2>
    <p class="lede">
      At rest the record peeks past the cover's edge; when the sleeve goes active
      it rolls out while the cover tilts. The whole move runs on one inheritable
      custom property, <code>--vinyl-extract</code>, so a parent can drive it
      from CSS alone — <strong>hover needs no JavaScript</strong>.
    </p>
    <div class="row stage">
      <figure>
        <div class="card" tabindex="0">
          ${sleeve({ cover: covers[0], tint: TINTS[0], size: 150, active: false })}
          <h3>Dawn</h3>
          <p>Hover or focus this card</p>
        </div>
        <figcaption><code>.card:hover { --vinyl-extract: 1 }</code></figcaption>
      </figure>
      <figure>
        <div class="card" tabindex="0">
          ${sleeve({ cover: covers[1], tint: TINTS[1], size: 150, active: false })}
          <h3>Bones</h3>
          <p>Hover or focus this card</p>
        </div>
        <figcaption>Same markup, different tint</figcaption>
      </figure>
      <figure>
        ${sleeve({
          cover: covers[2],
          tint: TINTS[2],
          size: 150,
          active: false,
          reserve: true,
          extra: ' id="toggle-sleeve"',
        })}
        <figcaption>Driven by the <code>active</code> prop instead</figcaption>
        <div class="controls">
          <button id="toggle-active" aria-pressed="false">Pull the record out</button>
          <span class="hint"><code>data-active</code> + <code>reserve</code></span>
        </div>
      </figure>
    </div>
  </section>

  <section>
    <h2>The stack</h2>
    <p class="lede">
      A crate of records, each showing its own cover. Hovering spreads the fan
      wider — a transform-only move, so nothing around it shifts.
    </p>
    <div class="stage">
      <div class="vk-stack" style="--vinyl-size:190px;--vk-count:${covers.length}">
      ${stackItems}
      </div>
    </div>
  </section>

  <section>
    <h2>Spin</h2>
    <p class="lede">
      Pausing freezes the record where it stopped rather than snapping it back to
      zero — like lifting the needle. The spin keyframes re-declare the record's
      <code>translateZ(0)</code>, because an animated transform would otherwise
      replace it and undo the compositing fix the blend mode depends on.
    </p>
    <div class="row stage">
      <figure>${disc({ cover: covers[3], tint: TINTS[3], sizePx: 190, spinning: true, label: "spinner" })}
        <figcaption><code>spinning={true}</code></figcaption></figure>
      <div class="controls">
        <button id="toggle-spin" aria-pressed="true">Pause the record</button>
        <span class="hint">watch where it stops</span>
      </div>
    </div>
  </section>

  <section>
    <h2>Colour from the cover</h2>
    <p class="lede">
      A plain average of a cover is mud — dark backgrounds and washed highlights
      win on pixel count. So pixels are weighted toward what the eye latches
      onto, saturated mid-lightness colour, then snapped onto a designed palette.
      This runs the package's actual <code>extractAccent</code> and
      <code>nearestColor</code>, compiled from source into this page.
    </p>
    <div class="row stage">
      <figure>${disc({ tint: "#808080", sizePx: 168, label: "accent-disc" })}
        <figcaption>Tinted by the colour read from the cover</figcaption></figure>
      <div>
        <div class="covers" id="cover-picker">
          ${covers
            .map(
              (cover, i) =>
                `<img src="${cover}" alt="Sample cover ${i + 1}" data-index="${i}" aria-pressed="${i === 0}">`
            )
            .join("\n          ")}
        </div>
        <p class="readout" id="readout">Sampling…</p>
        <div class="swatches" id="swatches"></div>
      </div>
    </div>
  </section>

  <footer>
    MIT © <a href="https://bohns.design">Alexis Bohns</a> — extracted from
    <a href="https://github.com/alexisbohns/melogram">Melogram</a>. Code and the
    bundled mask artwork alike, so the package is usable as a whole.
  </footer>
</div>
`;

const script = `
<script>${colorBundle}</script>
<script>
(function () {
  var COVERS = ${JSON.stringify(covers)};
  var THEMES = ${JSON.stringify(THEMES)};

  // Sleeve: the active state, toggled the way the React prop would.
  var sleeveEl = document.getElementById("toggle-sleeve");
  var activeBtn = document.getElementById("toggle-active");
  activeBtn.addEventListener("click", function () {
    var next = sleeveEl.dataset.active !== "true";
    sleeveEl.dataset.active = String(next);
    activeBtn.setAttribute("aria-pressed", String(next));
    activeBtn.textContent = next ? "Slide it back in" : "Pull the record out";
  });

  // Spin: false pauses in place, it does not reset.
  var spinner = document.getElementById("spinner");
  var spinBtn = document.getElementById("toggle-spin");
  spinBtn.addEventListener("click", function () {
    var next = spinner.dataset.spinning !== "true";
    spinner.dataset.spinning = String(next);
    spinBtn.setAttribute("aria-pressed", String(next));
    spinBtn.textContent = next ? "Pause the record" : "Spin the record";
  });

  // Accent extraction, using the package's own colour code.
  var accentDisc = document.getElementById("accent-disc");
  var readout = document.getElementById("readout");
  var swatches = document.getElementById("swatches");
  var picker = document.getElementById("cover-picker");
  var SAMPLE = 32;

  function sample(index) {
    var img = new Image();
    img.onload = function () {
      var canvas = document.createElement("canvas");
      canvas.width = SAMPLE;
      canvas.height = SAMPLE;
      var ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);
      var data = ctx.getImageData(0, 0, SAMPLE, SAMPLE);
      var accent = VinylKitColor.extractAccent(data);
      if (!accent) { readout.textContent = "No colour to read."; return; }

      var accents = THEMES.map(function (t) { return t[1]; });
      var matchIndex = VinylKitColor.nearestColor(accents, accent);
      var match = THEMES[matchIndex];

      accentDisc.style.setProperty("--vinyl-tint", accent);
      readout.innerHTML =
        "extractAccent → <b>" + accent + "</b> · nearestColor → <b>" + match[0] +
        " (" + match[1] + ")</b>";
      readout.dataset.accent = accent;
      readout.dataset.match = match[0];

      swatches.innerHTML = THEMES.map(function (t, i) {
        return '<span class="swatch" data-match="' + (i === matchIndex) + '">' +
          '<i style="background:' + t[1] + '"></i>' + t[0] + "</span>";
      }).join("");
    };
    img.src = COVERS[index];
  }

  picker.addEventListener("click", function (event) {
    var target = event.target.closest("img[data-index]");
    if (!target) return;
    Array.prototype.forEach.call(picker.querySelectorAll("img"), function (el) {
      el.setAttribute("aria-pressed", String(el === target));
    });
    sample(Number(target.dataset.index));
  });

  sample(0);
})();
</script>
`;

const styleBlock = `<style>\n/* vinyl-kit — src/vinyl.css, inlined verbatim */\n${css}\n/* demo page chrome */\n${pageCss}</style>`;

const title = "vinyl-kit — a tintable CSS vinyl record";
const full = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
${styleBlock}
</head>
<body>
${body}
${script}
</body>
</html>
`;

await writeFile(join(here, "index.html"), full);
console.log("demo/index.html written");

if (process.env.ARTIFACT_OUT) {
  await writeFile(
    process.env.ARTIFACT_OUT,
    `<title>${title}</title>\n${styleBlock}\n${body}\n${script}\n`
  );
  console.log(`${process.env.ARTIFACT_OUT} written`);
}
