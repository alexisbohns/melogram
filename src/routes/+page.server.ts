import type { PageServerLoad } from './$types';
import type { Album } from '$lib/types/albums';
import type { TrackOverview } from '$lib/types/tracks';

const TRACKS_URL = '/api/tracks?limit=4&sort=release_desc';
const ALBUMS_URL = '/api/albums?limit=9&sort=created_desc';

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
	const [tracksResult, albumsResult] = await Promise.all([
		loadCollection<TrackOverview>(fetch, TRACKS_URL, 'tracks'),
		loadCollection<Album>(fetch, ALBUMS_URL, 'albums')
	]);

	return {
		tracks: tracksResult.items.slice(0, 4),
		tracksError: tracksResult.error,
		albums: albumsResult.items.slice(0, 9),
		albumsError: albumsResult.error
	};
};
