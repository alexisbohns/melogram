export type ThreadKind = 'comment' | 'question';

export type Thread = {
	id: string;
	entity_type: string;
	entity_id: string;
	kind: ThreadKind;
	created_by: string;
	created_at: string;
	comment_count: number;
	last_activity_at: string;
};

export type Comment = {
	id: string;
	thread_id: string;
	user_id: string;
	body: string;
	parent_comment_id: string | null;
	is_published: boolean;
	created_at: string;
	updated_at: string;
};

export type ThreadWithComments = Thread & {
	comments: Comment[];
};

export type ThreadsResponse = {
	threads: ThreadWithComments[];
	nextCursor: string | null;
};

export type CreateThreadRequest = {
	entityType: string;
	entityId: string;
	kind: ThreadKind;
	body: string;
};

export type CreateThreadResponse = {
	thread_id: string;
	comment_id: string;
};

export type CreateCommentRequest = {
	body: string;
	parentCommentId?: string | null;
};
