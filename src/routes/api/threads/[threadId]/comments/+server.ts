import type { RequestHandler } from '@sveltejs/kit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const user = locals.user;
	if (!user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const threadId = params.threadId;
	if (!threadId || !UUID_RE.test(threadId)) {
		return new Response(JSON.stringify({ error: 'Invalid thread ID' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	let body: any;
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const { body: commentBody, parentCommentId } = body;

	if (!commentBody || typeof commentBody !== 'string' || commentBody.trim().length === 0) {
		return new Response(JSON.stringify({ error: 'body must be a non-empty string' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (parentCommentId && !UUID_RE.test(parentCommentId)) {
		return new Response(JSON.stringify({ error: 'parentCommentId must be a valid UUID' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		const { data, error } = await locals.supabase
			.from('comments')
			.insert({
				thread_id: threadId,
				user_id: user.id,
				body: commentBody.trim(),
				parent_comment_id: parentCommentId || null,
				is_published: true
			})
			.select()
			.single();

		if (error) {
			return new Response(JSON.stringify({ error: 'Failed to post reply' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		return new Response(JSON.stringify(data), {
			status: 201,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch {
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
