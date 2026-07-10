import { supabase } from "./supabase";
import type { Album, AlbumWithTracks, Track, TrackLyrics } from "./types";

const ALBUM_COLS = "id,name,description,type,cover_url,created_at";

/** Supabase errors are plain objects; wrap them so logs show a real message. */
function fail(context: string, error: { message?: string }): never {
  throw new Error(`${context}: ${error.message ?? JSON.stringify(error)}`);
}
const TRACK_COLS =
  "track_id,track_name,track_description,album_id,album_name,album_cover_url,latest_version_id,latest_status,latest_resource_url,latest_release_date,like_count";

function groupTracks(albums: Album[], tracks: Track[]): AlbumWithTracks[] {
  const byAlbum = new Map<string, Track[]>();
  for (const track of tracks) {
    if (!track.album_id) continue;
    const list = byAlbum.get(track.album_id) ?? [];
    list.push(track);
    byAlbum.set(track.album_id, list);
  }
  return albums.map((album) => ({
    ...album,
    tracks: byAlbum.get(album.id) ?? [],
  }));
}

export async function getAlbumsWithTracks(): Promise<AlbumWithTracks[]> {
  const [albumsRes, tracksRes] = await Promise.all([
    supabase
      .from("albums")
      .select(ALBUM_COLS)
      .order("created_at", { ascending: false }),
    supabase
      .from("track_overview")
      .select(TRACK_COLS)
      .not("album_id", "is", null)
      .order("latest_release_date", { ascending: false }),
  ]);

  if (albumsRes.error) fail("Failed to load albums", albumsRes.error);
  if (tracksRes.error) fail("Failed to load tracks", tracksRes.error);

  return groupTracks(
    (albumsRes.data ?? []) as Album[],
    (tracksRes.data ?? []) as Track[]
  );
}

export async function getAlbumWithTracks(
  id: string
): Promise<AlbumWithTracks | null> {
  const [albumRes, tracksRes] = await Promise.all([
    supabase.from("albums").select(ALBUM_COLS).eq("id", id).maybeSingle(),
    supabase
      .from("track_overview")
      .select(TRACK_COLS)
      .eq("album_id", id)
      .order("latest_release_date", { ascending: false }),
  ]);

  if (albumRes.error || !albumRes.data) return null;
  if (tracksRes.error) fail("Failed to load album tracks", tracksRes.error);

  return {
    ...(albumRes.data as Album),
    tracks: (tracksRes.data ?? []) as Track[],
  };
}

export async function getLyrics(trackIds: string[]): Promise<TrackLyrics> {
  if (trackIds.length === 0) return {};
  const { data, error } = await supabase
    .from("tracks")
    .select("id,lyrics")
    .in("id", trackIds);
  if (error) fail("Failed to load lyrics", error);
  return Object.fromEntries(
    (data ?? []).map((row) => [row.id as string, row.lyrics as string | null])
  );
}
