import type { PageServerLoad } from './$types';
import type { Album } from '$lib/types/albums';

const LIST_URL = '/api/albums?limit=50&sort=created_desc';

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const response = await fetch(LIST_URL);

		if (!response.ok) {
			return { albums: [], error: `Failed to load albums (${response.status})` };
		}

		const payload = await response.json();
		const items = Array.isArray(payload?.items) ? (payload.items as Album[]) : [];

		return { albums: items, error: null };
	} catch (err: any) {
		return { albums: [], error: err?.message ?? 'Unable to load albums' };
	}
};
