import type { RequestHandler } from '@sveltejs/kit';
import type { TrackOverview } from '$lib/types/tracks';

export const GET: RequestHandler = async ({ locals, url, setHeaders }) => {
	const user = locals.user;
	if (!user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const supabase = locals.supabase;
	const page = Math.max(parseInt(url.searchParams.get('page') ?? '1', 10), 1);
	const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '20', 10), 1), 100);
	const from = (page - 1) * limit;

	// 1) Get the user's liked track IDs ordered by like date
	const {
		data: likes,
		error: likesErr,
		count
	} = await supabase
		.from('track_likes')
		.select('track_id', { count: 'exact' })
		.eq('user_id', user.id)
		.order('created_at', { ascending: false })
		.range(from, from + limit - 1);

	if (likesErr) {
		return new Response(JSON.stringify({ error: likesErr.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const likedIds = (likes ?? []).map((l: { track_id: string }) => l.track_id);

	if (likedIds.length === 0) {
		setHeaders({
			'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
			'X-Total-Count': String(count ?? 0),
			'X-Page': String(page),
			'X-Limit': String(limit)
		});

		return new Response(JSON.stringify({ page, limit, total: count ?? 0, items: [] }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// 2) Fetch matching track_overview records
	const { data: tracks, error: tracksErr } = await supabase
		.from('track_overview')
		.select('*')
		.in('track_id', likedIds);

	if (tracksErr) {
		return new Response(JSON.stringify({ error: tracksErr.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// 3) Preserve like-date ordering
	const trackMap = new Map((tracks ?? []).map((t: TrackOverview) => [t.track_id, t]));
	const items: TrackOverview[] = likedIds
		.map((id: string) => {
			const t = trackMap.get(id);
			return t ? { ...t, liked_by_me: true } : null;
		})
		.filter(Boolean) as TrackOverview[];

	setHeaders({
		'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
		'X-Total-Count': String(count ?? 0),
		'X-Page': String(page),
		'X-Limit': String(limit)
	});

	return new Response(JSON.stringify({ page, limit, total: count ?? 0, items }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
};
