import Header from "@/components/Header";
import TracksSection from "@/components/TracksSection";
import AlbumsSection from "@/components/AlbumsSection";
import SinglesSection from "@/components/SinglesSection";
import { getAlbumsWithTracks, getFeaturedTracks } from "@/lib/data";
import styles from "./page.module.css";

export const revalidate = 300;

export default async function Home() {
  const all = await getAlbumsWithTracks();
  const { popular, latest } = await getFeaturedTracks(
    all.flatMap((album) => album.tracks)
  );

  // A release with a single track is a single, not an album.
  const albums = all.filter((album) => album.tracks.length >= 2);
  const singles = all.filter((album) => album.tracks.length < 2);

  return (
    <div className={styles.page}>
      <Header variant="home" />
      <TracksSection popular={popular} latest={latest} />
      <AlbumsSection albums={albums} />
      <SinglesSection singles={singles} />
    </div>
  );
}
