import type { PageServerLoad } from './$types';
import type { TrackOverview } from '$lib/types/tracks';

const TRACKS_URL = '/api/tracks?limit=100&sort=release_desc';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const response = await fetch(TRACKS_URL);

		if (!response.ok) {
			return { tracks: [], error: `Failed to load tracks (${response.status})` };
		}

		const payload = await response.json();
		const tracks = Array.isArray(payload?.items) ? (payload.items as TrackOverview[]) : [];

		return { tracks, error: null };
	} catch (err: any) {
		return { tracks: [], error: err?.message ?? 'Unable to load tracks' };
	}
};
