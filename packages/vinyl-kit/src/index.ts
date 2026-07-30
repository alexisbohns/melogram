export { default as Vinyl } from "./Vinyl";
export { default as VinylSleeve } from "./VinylSleeve";
export { default as VinylStack } from "./VinylStack";
export { useCoverAccent } from "./useCoverAccent";
export {
  extractAccent,
  nearestColor,
  colorDistance,
  hexToRgb,
  rgbToHex,
  saturationLightness,
} from "./color";
export { defaultMask, defaultTexture } from "./assets";
export { defaultRenderImage } from "./image";

export type { VinylImageProps, RenderImage } from "./types";
export type { VinylProps } from "./Vinyl";
export type { VinylSleeveProps } from "./VinylSleeve";
export type { VinylStackProps, VinylStackItem } from "./VinylStack";
export type { Rgb, PixelSource } from "./color";
export type { CoverAccentStatus, UseCoverAccentOptions } from "./useCoverAccent";
