import { getAlbumBasics } from "@/lib/data";
import {
  renderAlbumImage,
  OG_SIZE,
  OG_CONTENT_TYPE,
} from "@/lib/og/albumImage";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Album cover on Melogram";
// Cache the generated image; covers change rarely and rendering is not cheap.
export const revalidate = 3600;

type Props = { params: Promise<{ id: string }> };

export default async function Image({ params }: Props) {
  const { id } = await params;
  return renderAlbumImage(await getAlbumBasics(id));
}
