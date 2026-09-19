import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteLogo from "@/components/SiteLogo";
import Footer from "@/components/Footer";
import AlbumAside from "@/components/AlbumAside";
import AlbumSwitcher from "@/components/AlbumSwitcher";
import PaletteScope from "@/components/PaletteScope";
import Prose from "@/components/Prose";
import Section from "@/components/Section";
import SongVisualizer from "@/components/SongVisualizer";
import TrackHero from "@/components/TrackHero";
import TrackLyrics from "@/components/TrackLyrics";
import { getAlbumsWithTracks, getTrack } from "@/lib/data";
import { getLocale, getMessages } from "@/lib/i18n";
import { localized } from "@/lib/i18n/config";
import { hasVersion } from "@/lib/types";
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
  const m = getMessages(locale);
  const story = localized(track.track_story, track.track_story_fr, locale);

  // Sidebar: the album's own tracklist when there are siblings to move
  // between, and the album page's rail of other albums when there aren't —
  // a one-track album (or no album at all) would otherwise give the column a
  // list whose only entry is the page you're already on.
  const siblings = album ? album.tracks.filter(hasVersion) : [];
  const showTracklist = Boolean(album) && siblings.length > 1;
  const albums = showTracklist ? [] : await getAlbumsWithTracks();

  return (
    <div className={styles.page}>
      <SiteLogo />
      <PaletteScope
        album={{
          id: album?.id,
          name: album?.name,
          theme: album?.theme,
          coverUrl: track.album_cover_url,
        }}
      >
        <div className={styles.content}>
          <div className={styles.sidebar}>
            {showTracklist && album ? (
              <AlbumAside album={album} currentTrackId={track.track_id} />
            ) : (
              <AlbumSwitcher albums={albums} activeId={album?.id ?? ""} />
            )}
          </div>
          <article className={styles.track}>
            <TrackHero track={track} lyrics={lyrics} />
            <div className={styles.body}>
              <SongVisualizer track={track} lyrics={lyrics} />
              {story && (
                <Section title={m.sections.notes}>
                  <Prose markdown={story} />
                </Section>
              )}
              {lyrics && <TrackLyrics lyrics={lyrics} />}
            </div>
          </article>
        </div>
      </PaletteScope>
      <Footer />
    </div>
  );
}
