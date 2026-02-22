import type { RequestHandler } from '@sveltejs/kit';
import type { ThreadWithComments, ThreadsResponse, Comment } from '$lib/types/threads';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET: RequestHandler = async ({ locals, url }) => {
	const entityType = url.searchParams.get('entityType');
	const entityId = url.searchParams.get('entityId');
	const limit = Math.min(
		Math.max(parseInt(url.searchParams.get('limit') ?? '10', 10) || 10, 1),
		50
	);
	const cursor = url.searchParams.get('cursor');

	if (entityType !== 'track') {
		return new Response(JSON.stringify({ error: 'entityType must be "track"' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (!entityId || !UUID_RE.test(entityId)) {
		return new Response(JSON.stringify({ error: 'entityId must be a valid UUID' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		let query = locals.supabase
			.from('threads')
			.select('*')
			.eq('entity_type', entityType)
			.eq('entity_id', entityId)
			.order('last_activity_at', { ascending: false })
			.order('id', { ascending: false })
			.limit(limit + 1);

		if (cursor) {
			// cursor format: "last_activity_at|id"
			const [cursorDate, cursorId] = cursor.split('|');
			if (cursorDate && cursorId) {
				query = query.or(
					`last_activity_at.lt.${cursorDate},and(last_activity_at.eq.${cursorDate},id.lt.${cursorId})`
				);
			}
		}

		const { data: threads, error: threadsErr } = await query;

		if (threadsErr) {
			return new Response(JSON.stringify({ error: 'Failed to load threads' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const hasMore = (threads?.length ?? 0) > limit;
		const sliced = (threads ?? []).slice(0, limit);

		let nextCursor: string | null = null;
		if (hasMore && sliced.length > 0) {
			const last = sliced[sliced.length - 1];
			nextCursor = `${last.last_activity_at}|${last.id}`;
		}

		const threadIds = sliced.map((t) => t.id);

		let comments: Comment[] = [];
		if (threadIds.length > 0) {
			const { data: commentsData, error: commentsErr } = await locals.supabase
				.from('comments')
				.select('*')
				.in('thread_id', threadIds)
				.order('created_at', { ascending: true });

			if (!commentsErr && commentsData) {
				comments = commentsData;
			}
		}

		const commentsByThread = new Map<string, Comment[]>();
		for (const c of comments) {
			const list = commentsByThread.get(c.thread_id) ?? [];
			list.push(c);
			commentsByThread.set(c.thread_id, list);
		}

		const result: ThreadsResponse = {
			threads: sliced.map((thread) => ({
				...thread,
				comments: commentsByThread.get(thread.id) ?? []
			})) as ThreadWithComments[],
			nextCursor
		};

		return new Response(JSON.stringify(result), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch {
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};

export const POST: RequestHandler = async ({ locals, request }) => {
	const user = locals.user;
	if (!user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	let payload: { entityType?: string; entityId?: string; kind?: string; body?: string };
	try {
		payload = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const { entityType, entityId, kind, body: commentBody } = payload;

	if (entityType !== 'track') {
		return new Response(JSON.stringify({ error: 'entityType must be "track"' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (!entityId || !UUID_RE.test(entityId)) {
		return new Response(JSON.stringify({ error: 'entityId must be a valid UUID' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (kind !== 'comment' && kind !== 'question') {
		return new Response(JSON.stringify({ error: 'kind must be "comment" or "question"' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (!commentBody || typeof commentBody !== 'string' || commentBody.trim().length === 0) {
		return new Response(JSON.stringify({ error: 'body must be a non-empty string' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		const { data, error } = await locals.supabase.rpc('create_thread_with_comment', {
			p_entity_type: entityType,
			p_entity_id: entityId,
			p_kind: kind,
			p_body: commentBody.trim(),
			p_is_published: false
		});

		if (error) {
			return new Response(JSON.stringify({ error: 'Failed to create thread' }), {
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
