import { writable } from 'svelte/store';
import type {
	ThreadWithComments,
	ThreadsResponse,
	CreateThreadResponse,
	ThreadKind,
	Comment
} from '$lib/types/threads';

export const threads = writable<ThreadWithComments[]>([]);
export const threadsLoading = writable(false);
export const threadsError = writable<string | null>(null);
export const threadsCursor = writable<string | null>(null);

export async function fetchThreads(
	entityType: string,
	entityId: string,
	reset = false
): Promise<void> {
	threadsLoading.set(true);
	threadsError.set(null);

	let cursor: string | null = null;
	if (!reset) {
		threadsCursor.subscribe((v) => (cursor = v))();
	} else {
		threadsCursor.set(null);
	}

	try {
		const params = new URLSearchParams({
			entityType,
			entityId,
			limit: '10'
		});
		if (cursor) params.set('cursor', cursor);

		const res = await fetch(`/api/threads?${params}`);
		if (!res.ok) throw new Error('Failed to load threads');

		const data: ThreadsResponse = await res.json();

		if (reset) {
			threads.set(data.threads);
		} else {
			threads.update((current) => [...current, ...data.threads]);
		}
		threadsCursor.set(data.nextCursor);
	} catch (err: any) {
		threadsError.set(err?.message ?? 'Failed to load threads');
	} finally {
		threadsLoading.set(false);
	}
}

export async function createThread(
	entityType: string,
	entityId: string,
	kind: ThreadKind,
	body: string
): Promise<CreateThreadResponse | null> {
	try {
		const res = await fetch('/api/threads', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ entityType, entityId, kind, body })
		});

		if (!res.ok) throw new Error('Failed to create thread');

		const data: CreateThreadResponse = await res.json();
		// Refresh list after creation
		await fetchThreads(entityType, entityId, true);
		return data;
	} catch {
		return null;
	}
}

export async function postReply(
	threadId: string,
	body: string,
	entityType: string,
	entityId: string,
	parentCommentId?: string | null
): Promise<Comment | null> {
	try {
		const res = await fetch(`/api/threads/${threadId}/comments`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ body, parentCommentId: parentCommentId || null })
		});

		if (!res.ok) throw new Error('Failed to post reply');

		const data: Comment = await res.json();
		// Refresh list after reply
		await fetchThreads(entityType, entityId, true);
		return data;
	} catch {
		return null;
	}
}
