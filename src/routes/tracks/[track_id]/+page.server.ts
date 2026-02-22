import type { PageServerLoad } from './$types';
import { supabase } from '$lib/supabaseClient';
import type { Rights } from '$lib/types/rights';

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
			likeCount: 0,
			likedByMe: false,
			canAnswer: false,
			error: trackErr?.message ?? 'Track not found'
		};
	}

	// 2) Get version ids linked to this track via join table (no FK embedding required)
	const { data: links, error: linksErr } = await supabase
		.from('track_versions')
		.select('version_id')
		.eq('track_id', track.id);

	if (linksErr) {
		return {
			track,
			versions: [],
			likeCount: 0,
			likedByMe: false,
			canAnswer: false,
			error: linksErr.message
		};
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
	}

	// 4) Fetch like count
	const { count: likeCount } = await supabase
		.from('track_likes')
		.select('*', { count: 'exact', head: true })
		.eq('track_id', track.id);

	// 5) Check if current user liked this track
	let likedByMe = false;
	let canAnswer = false;
	const user = locals.user;
	if (user) {
		const { data: likeRow } = await supabase
			.from('track_likes')
			.select('user_id')
			.eq('track_id', track.id)
			.eq('user_id', user.id)
			.maybeSingle();
		likedByMe = !!likeRow;

		const { data: rights } = await locals.supabase
			.from('rights')
			.select('comments_answers')
			.eq('user_id', user.id)
			.maybeSingle<Rights>();
		canAnswer = rights?.comments_answers === true;
	}

	return {
		track,
		versions: versions ?? [],
		likeCount: likeCount ?? 0,
		likedByMe,
		canAnswer,
		error: verErr?.message ?? null
	};
};
