import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./supabase/anon";
import {
  hasVersion,
  trackPopularity,
  type Album,
  type AlbumWithTracks,
  type Genre,
  type Track,
  type TrackLyrics,
} from "./types";

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

/**
 * Attach each track's album theme from the album rows we already hold. The
 * `track_overview` view doesn't expose it, so without this the global player
 * can't resolve a Supabase-set theme and falls back to a default palette.
 */
function attachThemesFromAlbums(albums: Album[], tracks: Track[]): void {
  const themeById = new Map(albums.map((a) => [a.id, a.theme]));
  for (const track of tracks) {
    if (track.album_id) track.album_theme = themeById.get(track.album_id) ?? null;
  }
}

/** Likes come without album rows — fetch the themes for the tracks' albums. */
async function attachAlbumThemes(
  client: SupabaseClient,
  tracks: Track[]
): Promise<void> {
  const ids = [
    ...new Set(
      tracks
        .map((t) => t.album_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  if (ids.length === 0) return;
  const { data, error } = await client
    .from("albums")
    .select("id,theme")
    .in("id", ids);
  if (error) {
    console.error("Failed to load album themes", error.message);
    return;
  }
  const byId = new Map(
    (data ?? []).map((row) => [
      row.id as string,
      (row.theme as string | null) ?? null,
    ])
  );
  for (const track of tracks) {
    if (track.album_id) track.album_theme = byId.get(track.album_id) ?? null;
  }
}

/** Build an album_id → genres map from an `album_genres(genres(...))` join. */
function groupGenres(
  rows: { album_id: string; genres: Genre | null }[]
): Map<string, Genre[]> {
  const byAlbum = new Map<string, Genre[]>();
  for (const row of rows) {
    if (!row.genres) continue;
    const list = byAlbum.get(row.album_id) ?? [];
    list.push(row.genres);
    byAlbum.set(row.album_id, list);
  }
  return byAlbum;
}

function groupTracks(
  albums: Album[],
  tracks: Track[],
  position: Map<string, number>,
  genresByAlbum: Map<string, Genre[]>
): AlbumWithTracks[] {
  const byAlbum = new Map<string, Track[]>();
  for (const track of tracks) {
    if (!track.album_id) continue;
    const list = byAlbum.get(track.album_id) ?? [];
    list.push(track);
    byAlbum.set(track.album_id, list);
  }
  // Respect the artist-set order from album_tracks.position; tracks without a
  // recorded position fall to the end, keeping the query's release-date order.
  for (const list of byAlbum.values()) {
    list.sort(
      (a, b) =>
        (position.get(a.track_id) ?? Number.MAX_SAFE_INTEGER) -
        (position.get(b.track_id) ?? Number.MAX_SAFE_INTEGER)
    );
  }
  return albums.map((album) => ({
    ...album,
    tracks: byAlbum.get(album.id) ?? [],
    genres: genresByAlbum.get(album.id) ?? [],
  }));
}

export async function getAlbumsWithTracks(): Promise<AlbumWithTracks[]> {
  const [albumsRes, tracksRes, orderRes, genresRes] = await Promise.all([
    supabase
      .from("albums")
      .select(ALBUM_COLS)
      .order("created_at", { ascending: false }),
    supabase
      .from("track_overview")
      .select(TRACK_COLS)
      .not("album_id", "is", null)
      .order("latest_release_date", { ascending: false }),
    supabase.from("album_tracks").select("track_id,position"),
    supabase.from("album_genres").select("album_id,genres(id,name,slug)"),
  ]);

  if (albumsRes.error) fail("Failed to load albums", albumsRes.error);
  if (tracksRes.error) fail("Failed to load tracks", tracksRes.error);
  if (orderRes.error) fail("Failed to load track order", orderRes.error);
  // Genres are non-critical decoration (the home filter tabs fall back to the
  // display genre); degrade to none rather than break the catalog.
  if (genresRes.error) {
    console.error("Failed to load album genres", genresRes.error.message);
  }

  const position = new Map(
    (orderRes.data ?? []).map((r) => [
      r.track_id as string,
      r.position as number,
    ])
  );
  const genresByAlbum = groupGenres(
    (genresRes.data ?? []) as unknown as {
      album_id: string;
      genres: Genre | null;
    }[]
  );

  // Listener view: drop versionless tracks, then albums left with none. Owners
  // reach an album's full track list through getAlbumWithTracks (edit mode).
  const albums = (albumsRes.data ?? []) as Album[];
  const tracks = ((tracksRes.data ?? []) as Track[]).filter(hasVersion);
  attachThemesFromAlbums(albums, tracks);
  await attachDurations(supabase, tracks);
  return groupTracks(albums, tracks, position, genresByAlbum).filter(
    (album) => album.tracks.length > 0
  );
}

/**
 * Attach each track's total play count from the `track_play_counts` view.
 * Non-critical (only feeds the "Popular" ranking); a missing view or error
 * degrades every count to 0 rather than breaking the home page.
 */
async function attachPlayCounts(
  client: SupabaseClient,
  tracks: Track[]
): Promise<void> {
  const ids = [...new Set(tracks.map((t) => t.track_id))];
  if (ids.length === 0) return;
  const { data, error } = await client
    .from("track_play_counts")
    .select("track_id,play_count")
    .in("track_id", ids);
  if (error) {
    console.error("Failed to load play counts", error.message);
    for (const track of tracks) track.play_count = track.play_count ?? 0;
    return;
  }
  const byId = new Map(
    (data ?? []).map((row) => [
      row.track_id as string,
      Number(row.play_count) || 0,
    ])
  );
  for (const track of tracks) track.play_count = byId.get(track.track_id) ?? 0;
}

/**
 * Split a flat track list into the two home "Tracks" tabs:
 *  - `popular`: the top 3 by {@link trackPopularity} (likes weighted over plays)
 *  - `latest`:  the 3 most recently released (by the latest version's date)
 * Play counts are attached here so the ranking has them.
 */
export async function getFeaturedTracks(
  tracks: Track[],
  limit = 3
): Promise<{ popular: Track[]; latest: Track[] }> {
  await attachPlayCounts(supabase, tracks);
  const popular = [...tracks]
    .sort((a, b) => trackPopularity(b) - trackPopularity(a))
    .slice(0, limit);
  const latest = [...tracks]
    .filter((t) => t.latest_release_date)
    .sort((a, b) =>
      (b.latest_release_date ?? "").localeCompare(a.latest_release_date ?? "")
    )
    .slice(0, limit);
  return { popular, latest };
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

  const album = albumRes.data as Album;
  attachThemesFromAlbums([album], tracks);
  await attachDurations(supabase, tracks);
  return { ...album, tracks, genres };
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
  await Promise.all([
    attachDurations(client, ordered),
    attachAlbumThemes(client, ordered),
  ]);
  return ordered;
}
