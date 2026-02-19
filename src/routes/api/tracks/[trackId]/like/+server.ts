import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ locals, params }) => {
	const user = locals.user;
	if (!user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}

	const trackId = params.trackId;
	const { error } = await locals.supabase
		.from('track_likes')
		.upsert({ user_id: user.id, track_id: trackId }, { onConflict: 'user_id,track_id' });

	if (error) {
		return new Response(JSON.stringify({ error: error.message }), { status: 500 });
	}

	return new Response(JSON.stringify({ liked_by_me: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const user = locals.user;
	if (!user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}

	const trackId = params.trackId;
	const { error } = await locals.supabase
		.from('track_likes')
		.delete()
		.eq('user_id', user.id)
		.eq('track_id', trackId);

	if (error) {
		return new Response(JSON.stringify({ error: error.message }), { status: 500 });
	}

	return new Response(JSON.stringify({ liked_by_me: false }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
};
