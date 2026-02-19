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
