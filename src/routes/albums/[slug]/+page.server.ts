import type { PageServerLoad } from './$types';
import { supabase } from '$lib/supabaseClient';
import type { Album } from '$lib/types/albums';

export const load: PageServerLoad = async ({ params }) => {
	const { slug } = params;

	const { data, error } = await supabase
		.from('albums')
		.select('id, name, description, type, cover_url')
		.eq('id', slug)
		.returns<Album>()
		.single();

	if (error || !data) {
		return { album: null, error: error?.message ?? 'Album not found' };
	}

	return { album: data, error: null };
};
