import type { PageServerLoad } from './$types';
import type { Album, AlbumWithTracks } from '$lib/types/albums';
import type { TrackOverview } from '$lib/types/tracks';

const TRACKS_URL = '/api/tracks?limit=4&sort=release_desc';
const ALBUMS_URL = '/api/albums?limit=9&sort=created_desc';
// Fetch enough tracks to cover all albums shown on this page (max 9 albums × ~50 tracks each)
const ALL_TRACKS_URL = '/api/tracks?limit=500&sort=release_desc';

type LoadResult<T> = { items: T[]; error: string | null };

const loadCollection = async <T>(
	fetchFn: typeof fetch,
	url: string,
	label: string
): Promise<LoadResult<T>> => {
	try {
		const response = await fetchFn(url);

		if (!response.ok) {
			return { items: [], error: `Failed to load ${label} (${response.status})` };
		}

		const payload = await response.json();
		const items = Array.isArray(payload?.items) ? (payload.items as T[]) : [];

		return { items, error: null };
	} catch (err: any) {
		return { items: [], error: err?.message ?? `Unable to load ${label}` };
	}
};

export const load: PageServerLoad = async ({ fetch }) => {
	const [tracksResult, albumsResult, allTracksResult] = await Promise.all([
		loadCollection<TrackOverview>(fetch, TRACKS_URL, 'tracks'),
		loadCollection<Album>(fetch, ALBUMS_URL, 'albums'),
		loadCollection<TrackOverview>(fetch, ALL_TRACKS_URL, 'album tracks')
	]);

	const albums = albumsResult.items.slice(0, 9);

	const tracksByAlbumId = allTracksResult.items.reduce(
		(acc, track) => {
			if (track.album_id) {
				if (!acc[track.album_id]) acc[track.album_id] = [];
				acc[track.album_id].push(track);
			}
			return acc;
		},
		{} as Record<string, TrackOverview[]>
	);

	const albumsWithTracks: AlbumWithTracks[] = albums.map((album) => ({
		...album,
		tracks: tracksByAlbumId[album.id] ?? []
	}));

	return {
		tracks: tracksResult.items.slice(0, 4),
		tracksError: tracksResult.error,
		albums: albumsWithTracks,
		albumsError: albumsResult.error
	};
};
