import type { TrackOverview } from './tracks';

export type Album = {
	id: string;
	name: string;
	description: string | null;
	type?: string | null;
	cover_url: string | null;
};

export type AlbumWithTracks = Album & {
	tracks: TrackOverview[];
};
