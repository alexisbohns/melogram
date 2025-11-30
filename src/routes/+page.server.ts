import type { PageServerLoad } from './$types';
import type { TrackOverview } from '$lib/types/tracks';

export const load: PageServerLoad = async ({ fetch }) => {
	const url = '/api/tracks?limit=4&sort=release_desc';

	try {
		const response = await fetch(url);

		if (!response.ok) {
			return { tracks: [], error: `Failed to load tracks (${response.status})` };
		}

		const payload = await response.json();
		const items = Array.isArray(payload?.items) ? (payload.items as TrackOverview[]) : [];

		return {
			tracks: items.slice(0, 4),
			error: null
		};
	} catch (err: any) {
		return { tracks: [], error: err?.message ?? 'Unable to load tracks' };
	}
};
