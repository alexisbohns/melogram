import { createClient } from "@/lib/supabase/client";
import type { AlbumVersion, Genre, TrackDetails } from "@/lib/types";

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

/** Persist an album's color theme (a catalog key, or 'auto'). Powers the
    edit-mode theme picker; validate the key against THEMES before calling. */
export async function setAlbumTheme(
  albumId: string,
  theme: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("set_album_theme", {
    _album_id: albumId,
    _theme: theme,
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
  name: string,
  description: string | null,
  lyrics: string | null
): Promise<TrackDetails> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_track", {
    _album_id: albumId,
    _name: name,
    _description: description,
    _lyrics: lyrics,
  });
  if (error) throw new Error(error.message);
  return data as TrackDetails;
}

/** Authoritative editable fields, fetched fresh so update_track (a full
    overwrite) never clobbers description/lyrics with stale props. */
export async function getTrackDetails(trackId: string): Promise<TrackDetails> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tracks")
    .select("id,name,description,lyrics")
    .eq("id", trackId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Track not found");
  return data as TrackDetails;
}

export async function updateTrack(
  trackId: string,
  name: string,
  description: string | null,
  lyrics: string | null
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("update_track", {
    _track_id: trackId,
    _name: name,
    _description: description,
    _lyrics: lyrics,
  });
  if (error) throw new Error(error.message);
}

/** Delete the track everywhere, then best-effort remove its audio objects.
    Paths must come from the caller's already-loaded version list — the RPC
    deletes the version rows, so there is nothing left to enumerate after. */
export async function deleteTrackAndFiles(
  trackId: string,
  versions: AlbumVersion[]
): Promise<void> {
  const supabase = createClient();
  const paths: string[] = [];
  for (const v of versions) {
    if (!v.resource_url) continue;
    const path = versionPathFromUrl(v.resource_url);
    if (path) paths.push(path);
    else
      console.warn(
        `[edit] version ${v.id} has an unparseable resource_url; its file will be orphaned:`,
        v.resource_url
      );
  }
  const { error } = await supabase.rpc("delete_track", { _track_id: trackId });
  if (error) throw new Error(error.message);
  await removeVersionObjects(paths);
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

/** Upload a cover to the `covers` bucket and record its public URL.
    The stored URL is cache-busted: the object path is fixed, and an upsert
    does not purge the storage CDN, so a bare URL would serve the old image. */
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
  const base = supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
  const url = `${base}?v=${Date.now()}`;
  const { error } = await supabase.rpc("set_album_cover", {
    _album_id: albumId,
    _cover_url: url,
  });
  if (error) throw new Error(error.message);
  return url;
}

/** All versions of a track, newest first. created_at breaks the (common)
    same-release-date tie so the order is stable across refetches. */
export async function listTrackVersions(
  trackId: string
): Promise<AlbumVersion[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("track_versions")
    .select("versions(id,name,status,release_date,resource_url,created_at)")
    .eq("track_id", trackId);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((row) => (row as unknown as { versions: AlbumVersion | null }).versions)
    .filter((v): v is AlbumVersion => Boolean(v))
    .sort(
      (a, b) =>
        b.release_date.localeCompare(a.release_date) ||
        b.created_at.localeCompare(a.created_at)
    );
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

/** Delete the version row, then best-effort remove its audio object. */
export async function deleteVersionAndFile(
  version: AlbumVersion
): Promise<void> {
  const supabase = createClient();
  const path = version.resource_url
    ? versionPathFromUrl(version.resource_url)
    : null;
  const { error } = await supabase.rpc("delete_version", {
    _version_id: version.id,
  });
  if (error) throw new Error(error.message);
  await removeVersionObjects(path ? [path] : []);
}

/** Best-effort storage cleanup: never throws (the DB delete already
    committed), but logs what was left behind. remove() resolves without an
    error even when RLS filters the delete, so compare against the request. */
async function removeVersionObjects(paths: string[]): Promise<void> {
  if (!paths.length) return;
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("versions")
    .remove(paths);
  const removed = new Set((data ?? []).map((o) => o.name));
  const missed = paths.filter((p) => !removed.has(p));
  if (error || missed.length) {
    console.warn(
      "[edit] versions storage cleanup incomplete; orphaned objects:",
      missed,
      error?.message ?? "(no error — likely RLS-filtered)"
    );
  }
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
  await uploadToPath(row.upload_path, row.version_id, file);
  return row.version_id;
}

/** Attach audio to a fileless version, or replace an existing file.
    Replacing reuses the path parsed from the current URL so the original
    object is overwritten even if the track's slug changed since creation;
    attaching asks the server for the deterministic path. */
export async function uploadVersionAudio(
  version: AlbumVersion,
  file: File
): Promise<void> {
  const supabase = createClient();
  let path = version.resource_url
    ? versionPathFromUrl(version.resource_url)
    : null;
  if (!path) {
    const { data, error } = await supabase.rpc("version_upload_path", {
      _version_id: version.id,
    });
    if (error) throw new Error(error.message);
    path = data as string;
  }
  await uploadToPath(path, version.id, file);
}

/** Upload to the versions bucket and record a cache-busted public URL —
    the CDN keys on the query string, so replaced audio is fetched fresh. The
    audio length is measured once, here, from the local file so the app can
    show track/album times without every client re-sniffing them at render. */
async function uploadToPath(
  path: string,
  versionId: string,
  file: File
): Promise<void> {
  const supabase = createClient();
  const duration = await audioDurationFromFile(file);
  const up = await supabase.storage
    .from("versions")
    .upload(path, file, { upsert: true });
  if (up.error) throw new Error(up.error.message);
  const base = supabase.storage
    .from("versions")
    .getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.rpc("set_version_file", {
    _version_id: versionId,
    _resource_url: `${base}?v=${Date.now()}`,
    _duration: duration,
  });
  if (error) throw new Error(error.message);
}

/** Read an audio file's duration in the browser from a local object URL (no
    network — it decodes the file the user just picked). Best-effort: a decode
    failure resolves to null and never blocks the upload. */
function audioDurationFromFile(file: File): Promise<number | null> {
  if (typeof Audio === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    const finish = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    audio.addEventListener("loadedmetadata", () => {
      const d = audio.duration;
      finish(Number.isFinite(d) && d > 0 ? d : null);
    });
    audio.addEventListener("error", () => finish(null));
    audio.src = url;
  });
}

/** Storage object path from a `versions` bucket public URL (query stripped). */
function versionPathFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const rest = pathname.split("/object/public/versions/")[1];
    return rest ? decodeURIComponent(rest) : null;
  } catch {
    return null;
  }
}

export const VERSION_STATUSES = [
  "raw",
  "draft",
  "demo",
  "prototype",
  "final",
] as const;
export const ALBUM_TYPES = ["single", "ep", "album"] as const;
