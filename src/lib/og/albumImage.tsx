import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { getPalette } from "@/lib/palettes";

/**
 * Shared renderer for an album's social-share image (Open Graph / Twitter).
 * Reproduces the app's album showcase — the cover sleeve with its palette-
 * tinted vinyl peeking out — plus the album name and the Melogram wordmark, so
 * a shared link previews as a proper cover instead of a bare title.
 *
 * Runs on the Node runtime: it reads bundled fonts from disk and uses sharp to
 * (1) normalise any cover format (jpg/png/webp) to PNG, (2) tint the vinyl mask
 * — sharp's tint preserves luminance while applying chroma, matching the app's
 * `mix-blend-mode: luminosity` groove tint — and (3) apply the cover texture.
 * satori (next/og) can't blend or tint, so that compositing happens here.
 */

/** Standard landscape OG size; consumed as the route's `size` export too. */
export const OG_SIZE = { width: 1200, height: 630 };
/** JPEG, not PNG — see the re-encode note at the end of renderAlbumImage. */
export const OG_CONTENT_TYPE = "image/jpeg";

const BG = "#11090c"; // --bg
const COVER = 356; // rendered cover square (px)
const VINYL = Math.round(COVER * 0.94); // vinyl diameter (matches AlbumCover)
const PEEK = Math.round(COVER * 0.16); // vinyl overhang past the cover's edge
const GROUP_W = COVER + PEEK;
const PAD = 96;
const GAP = 76;
/** sharp raster size for cover/vinyl — 2x the on-card px for crispness. */
const RASTER = 420;

type OgAlbum = {
  name?: string | null;
  cover_url?: string | null;
  theme?: string | null;
} | null;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Blend two hex colors in sRGB; `t` is the weight toward `b`. */
function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const c = (k: "r" | "g" | "b") => Math.round(A[k] + (B[k] - A[k]) * t);
  return `rgb(${c("r")},${c("g")},${c("b")})`;
}

/** Title point size: shorter names read larger; long ones wrap in the column. */
function titleSize(name: string): number {
  const n = name.length;
  if (n <= 9) return 92;
  if (n <= 14) return 72;
  if (n <= 20) return 56;
  return 46;
}

let fontsPromise: Promise<[Buffer, Buffer]> | null = null;
function loadFonts(): Promise<[Buffer, Buffer]> {
  fontsPromise ??= Promise.all([
    readFile(join(process.cwd(), "public", "fonts", "Gloock-Regular.ttf")),
    readFile(join(process.cwd(), "public", "fonts", "SpaceGrotesk-Medium.ttf")),
  ]);
  return fontsPromise;
}

const asset = (file: string) => join(process.cwd(), "public", file);

/**
 * Fetch the cover, square-crop it, and apply the app's cover texture (a 0.6
 * multiply overlay). Returns a data URI, or null when there is no cover or the
 * fetch/decode fails — the caller then renders the palette gradient fallback.
 */
async function coverDataUri(
  coverUrl: string | null | undefined,
  size: number
): Promise<string | null> {
  if (!coverUrl) return null;
  try {
    const res = await fetch(coverUrl);
    if (!res.ok) return null;
    const input = Buffer.from(await res.arrayBuffer());
    const texture = await sharp(asset("cover-texture.png"))
      .resize(size, size)
      .ensureAlpha(0.6)
      .toBuffer();
    const buf = await sharp(input)
      .resize(size, size, { fit: "cover", position: "attention" })
      .composite([{ input: texture, blend: "multiply" }])
      .png()
      .toBuffer();
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** The vinyl mask tinted with the album's accent color, as a data URI. */
async function vinylDataUri(accent: string, size: number): Promise<string> {
  const buf = await sharp(asset("vinyl-mask.webp"))
    .resize(size, size)
    .tint(hexToRgb(accent))
    .png()
    .toBuffer();
  return `data:image/png;base64,${buf.toString("base64")}`;
}

export async function renderAlbumImage(album: OgAlbum): Promise<Response> {
  const name = album?.name?.trim() || "Melogram";
  const palette = getPalette(album ?? {});

  const [[gloock, grotesk], cover, vinyl] = await Promise.all([
    loadFonts(),
    coverDataUri(album?.cover_url, RASTER),
    vinylDataUri(palette.accent, RASTER),
  ]);

  const sleeve = cover ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={cover} width={COVER} height={COVER} alt="" />
  ) : (
    // Palette gradient + monogram — mirrors AlbumCover's loading backdrop so a
    // cover-less album still previews as a designed tile, not an empty square.
    <div
      style={{
        width: COVER,
        height: COVER,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${palette.deep}, ${mix(
          palette.accent,
          BG,
          0.6
        )})`,
      }}
    >
      <div
        style={{
          fontFamily: "Gloock",
          fontSize: 150,
          color: mix(palette.light, palette.deep, 0.35),
        }}
      >
        {name[0].toUpperCase()}
      </div>
    </div>
  );

  const png = new ImageResponse(
    (
      <div
        style={{
          width: OG_SIZE.width,
          height: OG_SIZE.height,
          display: "flex",
          alignItems: "center",
          background: BG,
          backgroundImage: `radial-gradient(680px 520px at 24% 52%, ${palette.deep}40, ${BG} 68%)`,
          padding: `0 ${PAD}px`,
          gap: GAP,
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            width: GROUP_W,
            height: COVER,
            flexShrink: 0,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={vinyl}
            width={VINYL}
            height={VINYL}
            alt=""
            style={{
              position: "absolute",
              top: (COVER - VINYL) / 2,
              left: GROUP_W - VINYL,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: COVER,
              height: COVER,
              display: "flex",
              borderRadius: 18,
              overflow: "hidden",
              boxShadow: "0 12px 44px rgba(0,0,0,0.55)",
            }}
          >
            {sleeve}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            maxWidth: OG_SIZE.width - GROUP_W - PAD * 2 - GAP,
          }}
        >
          <div
            style={{
              fontFamily: "Gloock",
              fontSize: titleSize(name),
              lineHeight: 1.06,
              color: palette.light,
            }}
          >
            {name}
          </div>
          <div
            style={{
              fontFamily: "SpaceGrotesk",
              fontSize: 25,
              letterSpacing: 8,
              marginTop: 18,
              color: mix(palette.accent, palette.light, 0.15),
            }}
          >
            MELOGRAM
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Gloock", data: gloock, weight: 400, style: "normal" },
        { name: "SpaceGrotesk", data: grotesk, weight: 500, style: "normal" },
      ],
    }
  );

  // next/og only emits PNG, and a 1200x630 photographic cover lands ~400KB —
  // over WhatsApp's ~300KB link-preview ceiling, so it silently drops the
  // image. The card is fully opaque, so re-encoding to JPEG loses no alpha and
  // brings it to ~30-40KB, which every scraper (WhatsApp included) shows.
  const jpeg = await sharp(Buffer.from(await png.arrayBuffer()))
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: {
      "content-type": OG_CONTENT_TYPE,
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
