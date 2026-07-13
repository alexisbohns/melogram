import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import AlbumPlaylist from "@/components/AlbumPlaylist";
import { getLikedTracks } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { getLocale, getMessages } from "@/lib/i18n";
import styles from "./page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const m = getMessages(await getLocale());
  return { title: m.meta.likesTitle };
}

export default async function LikesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const m = getMessages(await getLocale());
  const tracks = await getLikedTracks(supabase, user.id);

  return (
    <div className={styles.page}>
      <Header variant="compact" />
      <main className={styles.content}>
        <h1 className={styles.title}>{m.likes.title}</h1>
        {tracks.length === 0 ? (
          <p className={styles.empty}>{m.likes.empty}</p>
        ) : (
          <AlbumPlaylist tracks={tracks} variant="simple" />
        )}
      </main>
    </div>
  );
}
