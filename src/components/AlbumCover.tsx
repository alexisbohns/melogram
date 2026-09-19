import { VinylSleeve } from "vinyl-kit";
import {
  VINYL_MASK_URL,
  VINYL_TEXTURE_URL,
  albumVinylVars,
  nextVinylImage,
} from "@/lib/vinyl";

type Props = {
  coverUrl: string | null;
  alt: string;
  /** Rendered size (px) of the square cover; the vinyl adds ~16% width. */
  size: number;
  priority?: boolean;
  /**
   * Active state (album playing or on its page): the cover tilts and the vinyl
   * slides out from behind it. Defaults to the tucked-in resting state.
   */
  active?: boolean;
  /**
   * Reserve layout width for the extracted vinyl. Use in contexts with content
   * to the right of the cover (album header, switcher) so it isn't overlapped.
   */
  reserve?: boolean;
};

/**
 * The album showcase: cover sleeve with its record tucked behind it, in the
 * album's palette. A thin binding of vinyl-kit's `VinylSleeve` to Melogram's
 * `next/image` renderer and album colours.
 */
export default function AlbumCover({
  coverUrl,
  alt,
  size,
  priority,
  active = false,
  reserve = false,
}: Props) {
  return (
    <VinylSleeve
      cover={coverUrl}
      alt={alt}
      size={size}
      active={active}
      reserve={reserve}
      maskUrl={VINYL_MASK_URL}
      textureUrl={VINYL_TEXTURE_URL}
      renderImage={nextVinylImage(priority)}
      style={albumVinylVars}
    />
  );
}
