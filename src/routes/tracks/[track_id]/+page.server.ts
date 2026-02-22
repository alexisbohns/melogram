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
			canAnswer: false
			likeCount: 0,
			likedByMe: false,
			error: trackErr?.message ?? 'Track not found'
		};
	}

	// 2) Get version ids linked to this track via join table (no FK embedding required)
	const { data: links, error: linksErr } = await supabase
		.from('track_versions')
		.select('version_id')
		.eq('track_id', track.id);

	if (linksErr) {
		return { track, versions: [], likeCount: 0, likedByMe: false, error: linksErr.message, canAnswer: false };
	}

	const versionIds = (links ?? []).map((l) => l.version_id).filter(Boolean);

	let versions: any[] = [];
	let verErr: any = null;

	if (versionIds.length > 0) {
		// 3) Fetch the versions themselves, ordered by release_date desc
		const result = await supabase
			.from('versions')
			.select('id, name, resource_url, release_date, status, description')
			.in('id', versionIds)
			.order('release_date', { ascending: false });
		versions = result.data ?? [];
		verErr = result.error;
    return { track, versions: [], error: null, canAnswer: false };
	}

	// 4) Fetch like count
	const { count: likeCount } = await supabase
		.from('track_likes')
		.select('*', { count: 'exact', head: true })
		.eq('track_id', track.id);

	// 5) Check if current user liked this track
	let likedByMe = false;
	const user = locals.user;
	if (user) {
		const { data: likeRow } = await supabase
			.from('track_likes')
			.select('user_id')
			.eq('track_id', track.id)
			.eq('user_id', user.id)
			.maybeSingle();
		likedByMe = !!likeRow;
	}

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
	return {
		track,
		versions: versions ?? [],
		likeCount: likeCount ?? 0,
		likedByMe,
		error: verErr?.message ?? null,
    canAnswer
	};
};
