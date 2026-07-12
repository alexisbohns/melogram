import { createClient } from "@/lib/supabase/client";
import type { AlbumVersion, Genre } from "@/lib/types";

/** Artist ids the signed-in user may edit (own artist_members rows, RLS-scoped). */
export async function getMyArtistIds(): Promise<Set<string>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("artist_members")
    .select("artist_id");
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r) => r.artist_id as string));
}

export async function updateAlbum(
  albumId: string,
  name: string,
  description: string | null,
  type: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("update_album", {
    _album_id: albumId,
    _name: name,
    _description: description,
    _type: type,
  });
  if (error) throw new Error(error.message);
}

export async function setAlbumGenres(
  albumId: string,
  genreIds: string[]
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("set_album_genres", {
    _album_id: albumId,
    _genre_ids: genreIds,
  });
  if (error) throw new Error(error.message);
}

export async function createGenre(name: string): Promise<Genre> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_genre", { _name: name });
  if (error) throw new Error(error.message);
  return data as Genre;
}

export async function createTrack(
  albumId: string,
  name: string
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_track", {
    _album_id: albumId,
    _name: name,
    _description: null,
    _lyrics: null,
  });
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

export async function removeTrackFromAlbum(
  albumId: string,
  trackId: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("remove_track_from_album", {
    _album_id: albumId,
    _track_id: trackId,
  });
  if (error) throw new Error(error.message);
}

export async function reorderSetlist(
  albumId: string,
  orderedTrackIds: string[]
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("reorder_setlist", {
    _album_id: albumId,
    _ordered_track_ids: orderedTrackIds,
  });
  if (error) throw new Error(error.message);
}

/** Upload a cover to the `covers` bucket and record its public URL. */
export async function uploadAlbumCover(
  albumId: string,
  file: File
): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${albumId}/cover.${ext}`;
  const up = await supabase.storage
    .from("covers")
    .upload(path, file, { upsert: true });
  if (up.error) throw new Error(up.error.message);
  const url = supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.rpc("set_album_cover", {
    _album_id: albumId,
    _cover_url: url,
  });
  if (error) throw new Error(error.message);
  return url;
}

/** All versions of a track, newest release first (edit view). */
export async function listTrackVersions(
  trackId: string
): Promise<AlbumVersion[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("track_versions")
    .select("versions(id,name,status,release_date,resource_url)")
    .eq("track_id", trackId);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((row) => (row as unknown as { versions: AlbumVersion | null }).versions)
    .filter((v): v is AlbumVersion => Boolean(v))
    .sort((a, b) => b.release_date.localeCompare(a.release_date));
}

export async function updateVersion(
  versionId: string,
  name: string,
  status: string,
  releaseDate: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("update_version", {
    _version_id: versionId,
    _name: name,
    _status: status,
    _release_date: releaseDate,
  });
  if (error) throw new Error(error.message);
}

export async function deleteVersion(versionId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("delete_version", {
    _version_id: versionId,
  });
  if (error) throw new Error(error.message);
}

/** Create a version row, upload its audio, and record the URL. Returns the id. */
export async function createVersionWithFile(
  trackId: string,
  name: string,
  status: string,
  releaseDate: string,
  file: File
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_version", {
    _track_id: trackId,
    _name: name,
    _status: status,
    _release_date: releaseDate,
  });
  if (error) throw new Error(error.message);
  // create_version RETURNS TABLE(...) → PostgREST returns an array of rows.
  const row = (data as { version_id: string; upload_path: string }[])[0];
  if (!row) throw new Error("create_version returned no row");
  const { version_id, upload_path } = row;

  const up = await supabase.storage
    .from("versions")
    .upload(upload_path, file, { upsert: true });
  if (up.error) throw new Error(up.error.message);
  const url = supabase.storage
    .from("versions")
    .getPublicUrl(upload_path).data.publicUrl;

  const setErr = (
    await supabase.rpc("set_version_file", {
      _version_id: version_id,
      _resource_url: url,
    })
  ).error;
  if (setErr) throw new Error(setErr.message);
  return version_id;
}

export const VERSION_STATUSES = [
  "raw",
  "draft",
  "demo",
  "prototype",
  "final",
] as const;
export const ALBUM_TYPES = ["single", "ep", "album"] as const;
