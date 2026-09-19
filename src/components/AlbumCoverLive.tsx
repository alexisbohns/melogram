"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { usePlayer } from "@/player/PlayerProvider";
import AlbumCover from "./AlbumCover";

type Props = {
  /** null for a track that belongs to no album — nothing can make it active. */
  albumId: string | null;
  coverUrl: string | null;
  alt: string;
  size: number;
  priority?: boolean;
  reserve?: boolean;
  /**
   * This cover is what the page is about, whatever the URL says. The album
   * page infers that from the pathname; a track page can't (its path names
   * the track), so its hero declares it.
   */
  subject?: boolean;
};

/**
 * AlbumCover wired to the app's live state: the vinyl slides out of the cover
 * when this album is playing, or when we're on the page it headlines (album
 * page, track page, menu item).
 *
 * The record never turns here, only slides. Spinning belongs to the player
 * bar's disc, which is a bare record with nothing to be half-tucked into — a
 * sleeved vinyl rotating while still partly inside its sleeve reads as a
 * glitch, not as playback.
 *
 * The cover paints in its resting state first, then flips to active one frame
 * after mount, so an already-active cover plays the slide-out as an entrance
 * animation on load rather than appearing pre-extracted.
 */
export default function AlbumCoverLive({
  albumId,
  subject = false,
  ...cover
}: Props) {
  const pathname = usePathname();
  const { current, isPlaying } = usePlayer();

  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const onAlbumPage = albumId !== null && pathname === `/albums/${albumId}`;
  const playingThisAlbum =
    albumId !== null && current?.albumId === albumId && isPlaying;

  return (
    <AlbumCover
      active={entered && (subject || onAlbumPage || playingThisAlbum)}
      {...cover}
    />
  );
}
