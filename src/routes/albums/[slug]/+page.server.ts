import type { PageServerLoad } from './$types';
import { supabase } from '$lib/supabaseClient';
import type { Album } from '$lib/types/albums';
import type { TrackOverview } from '$lib/types/tracks';

export const load: PageServerLoad = async ({ params, fetch }) => {
	const { slug } = params;

	const { data, error } = await supabase
		.from('albums')
		.select('id, name, description, type, cover_url')
		.eq('id', slug)
		.returns<Album>()
		.single();

	if (error || !data) {
		return {
			album: null,
			tracks: [],
			error: error?.message ?? 'Album not found',
			tracksError: null
		};
	}

	let tracks: TrackOverview[] = [];
	let tracksError: string | null = null;

	try {
		const response = await fetch(
			`/api/tracks?album_id=${encodeURIComponent(slug)}&limit=50&sort=release_desc`
		);

		if (!response.ok) {
			tracksError = `Failed to load tracks (${response.status})`;
		} else {
			const payload = await response.json();
			tracks = Array.isArray(payload?.items) ? (payload.items as TrackOverview[]) : [];
		}
	} catch (err: any) {
		tracksError = err?.message ?? 'Unable to load tracks';
	}

	return { album: data, tracks, error: null, tracksError };
};
