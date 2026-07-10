import Header from "@/components/Header";
import AlbumCard from "@/components/AlbumCard";
import { getAlbumsWithTracks } from "@/lib/data";
import styles from "./page.module.css";

export const revalidate = 300;

export default async function Home() {
  const albums = await getAlbumsWithTracks();

  return (
    <div className={styles.page}>
      <Header variant="home" />
      <main className={styles.albums}>
        {albums.map((album) => (
          <AlbumCard key={album.id} album={album} />
        ))}
      </main>
    </div>
  );
}
