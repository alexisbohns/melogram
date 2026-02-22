import type { PageServerLoad } from './$types';
import { supabase } from '$lib/supabaseClient';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { track_id } = params;

	// 1) Fetch the track by id
	const { data: track, error: trackErr } = await supabase
		.from('tracks')
		.select('id, slug, name, description, cover_url, created_at, lyrics')
		.eq('id', track_id)
		.single();

	if (trackErr || !track) {
		return {
			track: null,
			versions: [],
			error: trackErr?.message ?? 'Track not found',
			canAnswer: false
		};
	}

	// 2) Get version ids linked to this track via join table (no FK embedding required)
	const { data: links, error: linksErr } = await supabase
		.from('track_versions')
		.select('version_id')
		.eq('track_id', track.id);

	if (linksErr) {
		return { track, versions: [], error: linksErr.message, canAnswer: false };
	}

	const versionIds = (links ?? []).map((l) => l.version_id).filter(Boolean);

	if (versionIds.length === 0) {
		return { track, versions: [], error: null, canAnswer: false };
	}

	// 3) Fetch the versions themselves, ordered by release_date desc
	const { data: versions, error: verErr } = await supabase
		.from('versions')
		.select('id, name, resource_url, release_date, status, description')
		.in('id', versionIds)
		.order('release_date', { ascending: false });

	// 4) Check if the authenticated user has comments_answers right
	let canAnswer = false;
	if (locals.user) {
		const { data: rights } = await locals.supabase
			.from('rights')
			.select('comments_answers')
			.eq('user_id', locals.user.id)
			.maybeSingle();
		canAnswer = rights?.comments_answers === true;
	}

	return { track, versions: versions ?? [], error: verErr?.message ?? null, canAnswer };
};
