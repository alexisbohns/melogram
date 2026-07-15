import { getAlbumBasics } from "@/lib/data";
import {
  renderAlbumImage,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/albumImage";

// Twitter/X share image — same renderer as the Open Graph image. Kept as its
// own file (rather than re-exporting) because route-segment config such as
// `revalidate` must be a statically-analysable literal export.
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Album cover on Melogram";
export const revalidate = 3600;

type Props = { params: Promise<{ id: string }> };

export default async function Image({ params }: Props) {
  const { id } = await params;
  return renderAlbumImage(await getAlbumBasics(id));
}
