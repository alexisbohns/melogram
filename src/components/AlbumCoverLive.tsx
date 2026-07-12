"use client";

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
 */
export default function AlbumCoverLive({ albumId, ...cover }: Props) {
  const pathname = usePathname();
  const { current, isPlaying } = usePlayer();

  const onAlbumPage = pathname === `/albums/${albumId}`;
  const playingThisAlbum = current?.albumId === albumId && isPlaying;

  return <AlbumCover active={onAlbumPage || playingThisAlbum} {...cover} />;
}
