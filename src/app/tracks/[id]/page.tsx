import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import AlbumAside from "@/components/AlbumAside";
import PaletteScope from "@/components/PaletteScope";
import Prose from "@/components/Prose";
import SongVisualizer from "@/components/SongVisualizer";
import TrackHero from "@/components/TrackHero";
import { getTrack } from "@/lib/data";
import { getLocale } from "@/lib/i18n";
import { localized } from "@/lib/i18n/config";
import styles from "./page.module.css";

export const revalidate = 300;

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const page = await getTrack(id);
  if (!page) return { title: "Bohns — Melogram" };

  const { track } = page;
  const locale = await getLocale();
  const title = `${track.track_name} — Bohns`;
  const description =
    localized(track.track_description, track.track_description_fr, locale) ??
    `${track.track_name} on Melogram.`;
  // The cover image comes from the opengraph-image / twitter-image routes;
  // here we only enrich the surrounding card text.
  return {
    title,
    description,
    openGraph: { title, description, type: "music.song" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function TrackPage({ params }: Props) {
  const { id } = await params;
  const page = await getTrack(id);
  if (!page) notFound();

  const { track, album, lyrics } = page;
  const locale = await getLocale();
  const story = localized(track.track_story, track.track_story_fr, locale);

  return (
    <div className={styles.page}>
      <Header variant="compact" />
      <PaletteScope
        album={{
          id: album?.id,
          name: album?.name,
          theme: album?.theme,
          coverUrl: track.album_cover_url,
        }}
      >
        <div
          className={`${styles.content} ${album ? "" : styles.soloColumn}`}
        >
          {album && (
            <AlbumAside album={album} currentTrackId={track.track_id} />
          )}
          <article className={styles.track}>
            <TrackHero track={track} lyrics={lyrics} />
            <SongVisualizer track={track} lyrics={lyrics} />
            {story && <Prose markdown={story} />}
          </article>
        </div>
      </PaletteScope>
    </div>
  );
}
