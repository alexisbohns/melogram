import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import AlbumSwitcher from "@/components/AlbumSwitcher";
import AlbumDetailCard from "@/components/AlbumDetailCard";
import { getAlbumsWithTracks, getLyrics } from "@/lib/data";
import styles from "./page.module.css";

export const revalidate = 300;

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const albums = await getAlbumsWithTracks();
  const album = albums.find((a) => a.id === id);
  return { title: album ? `${album.name} — Bohns` : "Bohns — Melogram" };
}

export default async function AlbumPage({ params }: Props) {
  const { id } = await params;

  const albums = await getAlbumsWithTracks();
  const album = albums.find((a) => a.id === id);
  if (!album) notFound();

  const lyrics = await getLyrics(album.tracks.map((t) => t.track_id));

  return (
    <div className={styles.page}>
      <Header variant="compact" />
      <div className={styles.content}>
        <AlbumSwitcher albums={albums} activeId={album.id} />
        <AlbumDetailCard album={album} lyrics={lyrics} />
      </div>
    </div>
  );
}
