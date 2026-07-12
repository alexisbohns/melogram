export type Album = {
  id: string;
  artist_id: string | null;
  name: string;
  description: string | null;
  type: string | null;
  cover_url: string | null;
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
};

export type AlbumWithTracks = Album & {
  tracks: Track[];
  genres: Genre[];
};

export type TrackLyrics = Record<string, string | null>;
