export type Album = {
  id: string;
  name: string;
  description: string | null;
  type: string | null;
  cover_url: string | null;
  created_at: string;
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
};

export type TrackLyrics = Record<string, string | null>;
