import Header from "@/components/Header";
import TracksSection from "@/components/TracksSection";
import AlbumsSection from "@/components/AlbumsSection";
import { getAlbumsWithTracks, getFeaturedTracks } from "@/lib/data";
import styles from "./page.module.css";

export const revalidate = 300;

export default async function Home() {
  const albums = await getAlbumsWithTracks();
  const { popular, latest } = await getFeaturedTracks(
    albums.flatMap((album) => album.tracks)
  );

  return (
    <div className={styles.page}>
      <Header variant="home" />
      <TracksSection popular={popular} latest={latest} />
      <AlbumsSection albums={albums} />
    </div>
  );
}
