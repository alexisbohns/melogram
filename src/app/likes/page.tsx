import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import AlbumPlaylist from "@/components/AlbumPlaylist";
import { getLikedTracks } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "My likes — Bohns" };

export default async function LikesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const tracks = await getLikedTracks(supabase, user.id);

  return (
    <div className={styles.page}>
      <Header variant="compact" />
      <main className={styles.content}>
        <h1 className={styles.title}>My likes</h1>
        {tracks.length === 0 ? (
          <p className={styles.empty}>
            You haven&apos;t liked any tracks yet. Tap the heart on a track to
            save it here.
          </p>
        ) : (
          <AlbumPlaylist tracks={tracks} variant="simple" />
        )}
      </main>
    </div>
  );
}
