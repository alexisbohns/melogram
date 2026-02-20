import type { RequestHandler } from '@sveltejs/kit';

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

	if (!track_id || typeof track_id !== 'string') {
		return new Response(JSON.stringify({ error: 'track_id is required' }), { status: 400 });
	}

	// Basic UUID format validation to avoid unnecessary database calls and clearer errors.
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (!uuidRegex.test(track_id)) {
		return new Response(JSON.stringify({ error: 'track_id must be a valid UUID' }), {
			status: 400
		});
	}

	// Optionally verify that the track exists before recording a play.
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

	const { error } = await supabase.from('track_plays').insert({
		track_id,
		source: typeof source === 'string' ? source : null,
		user_id: user?.id ?? null,
		// Ignore anonymous_id when the user is authenticated.
		anonymous_id: user ? null : typeof anonymous_id === 'string' ? anonymous_id : null
	});

	if (error) {
		return new Response(JSON.stringify({ error: error.message }), { status: 500 });
	}

	return new Response(JSON.stringify({ success: true }), { status: 201 });
};
