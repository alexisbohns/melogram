import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./supabase/anon";
import type { Album, AlbumWithTracks, Genre, Track, TrackLyrics } from "./types";

const ALBUM_COLS =
  "id,artist_id,name,description,type,cover_url,theme,created_at";

/** Supabase errors are plain objects; wrap them so logs show a real message. */
function fail(context: string, error: { message?: string }): never {
  throw new Error(`${context}: ${error.message ?? JSON.stringify(error)}`);
}
const TRACK_COLS =
  "track_id,track_name,track_description,album_id,album_name,album_cover_url,latest_version_id,latest_status,latest_resource_url,latest_release_date,like_count";

/**
 * Fill in each track's `duration` from `versions.duration_seconds`, keyed on
 * the latest version id the overview already carries. One batched query keeps
 * this cheap; duration is non-critical, so a failure degrades to null (the UI
 * simply omits the time) rather than breaking the page.
 */
async function attachDurations(
  client: SupabaseClient,
  tracks: Track[]
): Promise<void> {
  const ids = [
    ...new Set(
      tracks
        .map((t) => t.latest_version_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  let byId = new Map<string, number | null>();
  if (ids.length > 0) {
    const { data, error } = await client
      .from("versions")
      .select("id,duration_seconds")
      .in("id", ids);
    if (error) {
      console.error("Failed to load track durations", error.message);
    } else {
      byId = new Map(
        (data ?? []).map((row) => [
          row.id as string,
          (row.duration_seconds as number | null) ?? null,
        ])
      );
    }
  }
  for (const track of tracks) {
    track.duration = track.latest_version_id
      ? byId.get(track.latest_version_id) ?? null
      : null;
  }
}

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
    genres: [],
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

  const tracks = (tracksRes.data ?? []) as Track[];
  await attachDurations(supabase, tracks);
  return groupTracks((albumsRes.data ?? []) as Album[], tracks);
}

export async function getAlbumWithTracks(
  id: string
): Promise<AlbumWithTracks | null> {
  const [albumRes, tracksRes, orderRes, genresRes] = await Promise.all([
    supabase.from("albums").select(ALBUM_COLS).eq("id", id).maybeSingle(),
    supabase.from("track_overview").select(TRACK_COLS).eq("album_id", id),
    supabase.from("album_tracks").select("track_id,position").eq("album_id", id),
    supabase
      .from("album_genres")
      .select("genres(id,name,slug)")
      .eq("album_id", id),
  ]);

  if (albumRes.error || !albumRes.data) return null;
  if (tracksRes.error) fail("Failed to load album tracks", tracksRes.error);

  const position = new Map(
    (orderRes.data ?? []).map((r) => [
      r.track_id as string,
      r.position as number,
    ])
  );
  const tracks = ((tracksRes.data ?? []) as Track[]).slice().sort(
    (a, b) =>
      (position.get(a.track_id) ?? Number.MAX_SAFE_INTEGER) -
      (position.get(b.track_id) ?? Number.MAX_SAFE_INTEGER)
  );

  const genres = (genresRes.data ?? [])
    .map((row) => (row as unknown as { genres: Genre | null }).genres)
    .filter((g): g is Genre => Boolean(g));

  await attachDurations(supabase, tracks);
  return { ...(albumRes.data as Album), tracks, genres };
}

/** All genres, alphabetical — powers the edit combobox. */
export async function getGenres(): Promise<Genre[]> {
  const { data, error } = await supabase
    .from("genres")
    .select("id,name,slug")
    .order("name");
  if (error) fail("Failed to load genres", error);
  return (data ?? []) as Genre[];
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

/**
 * Tracks the given user has liked, most recently liked first.
 * Requires an authenticated client (RLS restricts track_likes to the owner).
 */
export async function getLikedTracks(
  client: SupabaseClient,
  userId: string
): Promise<Track[]> {
  const { data: likes, error: likesErr } = await client
    .from("track_likes")
    .select("track_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (likesErr) fail("Failed to load likes", likesErr);

  const likedIds = (likes ?? []).map((row) => row.track_id as string);
  if (likedIds.length === 0) return [];

  const { data: tracks, error: tracksErr } = await client
    .from("track_overview")
    .select(TRACK_COLS)
    .in("track_id", likedIds);
  if (tracksErr) fail("Failed to load liked tracks", tracksErr);

  // Preserve the like-recency order from the track_likes query.
  const byId = new Map(
    ((tracks ?? []) as Track[]).map((track) => [track.track_id, track])
  );
  const ordered = likedIds
    .map((id) => byId.get(id))
    .filter((track): track is Track => Boolean(track));
  await attachDurations(client, ordered);
  return ordered;
}
