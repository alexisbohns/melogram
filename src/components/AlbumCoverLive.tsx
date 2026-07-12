"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { usePlayer } from "@/player/PlayerProvider";
import AlbumCover from "./AlbumCover";

type Props = {
  albumId: string;
  coverUrl: string | null;
  alt: string;
  size: number;
  priority?: boolean;
  reserve?: boolean;
};

/**
 * AlbumCover wired to the app's live state: the vinyl slides out of the cover
 * when this album is playing, or when we're on its page (menu item + header).
 *
 * The cover paints in its resting state first, then flips to active one frame
 * after mount, so an already-active cover plays the slide-out as an entrance
 * animation on load rather than appearing pre-extracted.
 */
export default function AlbumCoverLive({ albumId, ...cover }: Props) {
  const pathname = usePathname();
  const { current, isPlaying } = usePlayer();

  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const onAlbumPage = pathname === `/albums/${albumId}`;
  const playingThisAlbum = current?.albumId === albumId && isPlaying;

  return (
    <AlbumCover active={entered && (onAlbumPage || playingThisAlbum)} {...cover} />
  );
}
