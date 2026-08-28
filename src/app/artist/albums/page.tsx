import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import AlbumOrderList from "@/components/edit/AlbumOrderList";
import { getArtistAlbumsInOrder } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { getLocale, getMessages } from "@/lib/i18n";
import styles from "./page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const m = getMessages(await getLocale());
  return { title: m.meta.albumOrderTitle };
}

/**
 * Artist-only page: rank the albums the home page shows. Reached from the
 * account menu, which only offers it to artist members — this page re-checks
 * membership server-side (RLS scopes artist_members to the caller), and the
 * reorder RPC checks it a third time before writing.
 */
export default async function AlbumOrderPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: memberships } = await supabase
    .from("artist_members")
    .select("artist_id");
  const artistId = memberships?.[0]?.artist_id as string | undefined;
  if (!artistId) redirect("/");

  const m = getMessages(await getLocale());
  const albums = await getArtistAlbumsInOrder(artistId);

  return (
    <div className={styles.page}>
      <Header variant="compact" />
      <main className={styles.content}>
        <h1 className={styles.title}>{m.albumOrder.title}</h1>
        <p className={styles.intro}>{m.albumOrder.intro}</p>
        <AlbumOrderList artistId={artistId} albums={albums} />
      </main>
    </div>
  );
}
