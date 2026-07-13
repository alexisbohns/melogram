export type Album = {
  id: string;
  artist_id: string | null;
  name: string;
  description: string | null;
  type: string | null;
  cover_url: string | null;
  /** Color theme key (see src/lib/palettes.ts); 'auto' derives it from the cover. */
  theme: string;
  created_at: string;
};

export type Genre = { id: string; name: string; slug: string };

/** A full row of public.versions (edit view — the read view uses Track). */
export type AlbumVersion = {
  id: string;
  name: string;
  status: string;
  release_date: string;
  resource_url: string | null;
  created_at: string;
};

/** Authoritative editable fields of a public.tracks row (edit view). */
export type TrackDetails = {
  id: string;
  name: string;
  description: string | null;
  lyrics: string | null;
};

/** One row of the `track_overview` Supabase view. */
export type Track = {
  track_id: string;
  track_name: string;
  track_description: string | null;
  album_id: string | null;
  album_name: string | null;
  album_cover_url: string | null;
  latest_version_id: string | null;
  latest_status: string | null;
  latest_resource_url: string | null;
  latest_release_date: string | null;
  like_count: number | null;
  /**
   * Playback length (seconds) of the latest version. Populated by the data
   * layer from `versions.duration_seconds`; null until it has been computed
   * (on upload, or by the backfill script for pre-existing rows).
   */
  duration: number | null;
};

export type AlbumWithTracks = Album & {
  tracks: Track[];
  genres: Genre[];
};

/**
 * A track is publicly visible once it carries at least one version. Versionless
 * tracks — and albums composed only of them — are hidden from listeners; owners
 * still see them (in read mode when signed in, and always in edit mode) so they
 * can attach a first version.
 */
export function hasVersion(track: Track): boolean {
  return track.latest_version_id !== null;
}

export type TrackLyrics = Record<string, string | null>;
