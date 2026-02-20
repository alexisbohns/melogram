import type { RequestHandler } from '@sveltejs/kit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Minimum seconds between two logged plays of the same track by the same identity. */
const RATE_LIMIT_SECONDS = 10;

export const POST: RequestHandler = async ({ request, locals }) => {
	const supabase = locals.supabase;

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
	}

	const { track_id, source, anonymous_id } = body as {
		track_id?: unknown;
		source?: unknown;
		anonymous_id?: unknown;
	};

	if (!track_id || typeof track_id !== 'string' || !UUID_RE.test(track_id)) {
		return new Response(JSON.stringify({ error: 'track_id must be a valid UUID' }), {
			status: 400
		});
	}

	// Verify the track exists before recording a play.
	const { data: track, error: trackLookupError } = await supabase
		.from('tracks')
		.select('id')
		.eq('id', track_id)
		.maybeSingle();

	if (trackLookupError) {
		return new Response(JSON.stringify({ error: trackLookupError.message }), { status: 500 });
	}

	if (!track) {
		return new Response(JSON.stringify({ error: 'Track not found' }), { status: 404 });
	}

	const user = locals.user;

	// For unauthenticated requests, anonymous_id must be a valid UUID.
	const resolvedAnonymousId =
		!user && typeof anonymous_id === 'string' && UUID_RE.test(anonymous_id) ? anonymous_id : null;

	// Require at least one identity to be present (mirrors the DB CHECK constraint).
	if (!user && !resolvedAnonymousId) {
		return new Response(JSON.stringify({ error: 'anonymous_id must be a valid UUID' }), {
			status: 400
		});
	}

	// Server-side rate limiting: reject duplicate plays within the cooldown window.
	const since = new Date(Date.now() - RATE_LIMIT_SECONDS * 1000).toISOString();
	let recentQuery = supabase
		.from('track_plays')
		.select('id', { count: 'exact', head: true })
		.eq('track_id', track_id)
		.gte('created_at', since);

	if (user) {
		recentQuery = recentQuery.eq('user_id', user.id);
	} else {
		recentQuery = recentQuery.eq('anonymous_id', resolvedAnonymousId!);
	}

	const { count, error: rateError } = await recentQuery;
	if (rateError) {
		return new Response(JSON.stringify({ error: rateError.message }), { status: 500 });
	}
	if (count && count > 0) {
		return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 });
	}

	const { error } = await supabase.from('track_plays').insert({
		track_id,
		source: typeof source === 'string' ? source : null,
		user_id: user?.id ?? null,
		anonymous_id: user ? null : resolvedAnonymousId
	});

	if (error) {
		return new Response(JSON.stringify({ error: error.message }), { status: 500 });
	}

	return new Response(JSON.stringify({ success: true }), { status: 201 });
};
