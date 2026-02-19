import type { RequestHandler } from '@sveltejs/kit';
import type { ThreadWithComments, ThreadsResponse, Comment } from '$lib/types/threads';

export const GET: RequestHandler = async ({ locals, url }) => {
	const limit = Math.min(
		Math.max(parseInt(url.searchParams.get('limit') ?? '10', 10) || 10, 1),
		50
	);
	const cursor = url.searchParams.get('cursor');

	try {
		let query = locals.supabase
			.from('threads')
			.select('*')
			.order('last_activity_at', { ascending: false })
			.order('id', { ascending: false })
			.limit(limit + 1);

		if (cursor) {
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
