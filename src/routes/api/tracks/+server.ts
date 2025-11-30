import type { RequestHandler } from '@sveltejs/kit';

export type TrackOverview = {
	track_id: string;
	track_name: string;
	track_description: string | null;
	album_id: string | null;
	album_name: string | null;
	album_cover_url: string | null;
	latest_status: string | null;
	latest_resource_url: string | null;
	latest_release_date: string | null;
  	latest_version_id: string | null;
};

const TABLE = 'track_overview';

export const GET: RequestHandler = async ({ locals, url, setHeaders }) => {
	const supabase = locals.supabase;

	const page = Math.max(parseInt(url.searchParams.get('page') ?? '1', 10), 1);
	const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '20', 10), 1), 100);
	const q = url.searchParams.get('q')?.trim() || '';
	const statusParam = url.searchParams.get('status')?.trim() || '';
	const albumName = url.searchParams.get('album')?.trim() || '';
	const sort = url.searchParams.get('sort') || 'release_desc';

	const from = (page - 1) * limit;
	const to = from + limit - 1;

	let query = supabase.from(TABLE).select('*', { count: 'exact' });

	if (q) {
		query = query.or(`track_name.ilike.%${q}%,album_name.ilike.%${q}%`);
	}

	if (statusParam) {
		const statuses = statusParam
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		if (statuses.length === 1) {
			query = query.eq('latest_status', statuses[0]);
		} else if (statuses.length > 1) {
			query = query.in('latest_status', statuses);
		}
	}

	if (albumName) {
		query = query.ilike('album_name', albumName);
	}

	switch (sort) {
		case 'release_asc':
			query = query.order('latest_release_date', { ascending: true, nullsFirst: true });
			break;
		case 'name_asc':
			query = query.order('track_name', { ascending: true });
			break;
		case 'name_desc':
			query = query.order('track_name', { ascending: false });
			break;
		case 'release_desc':
		default:
			query = query.order('latest_release_date', { ascending: false, nullsFirst: false });
			break;
	}

	const { data, error, count } = await query.range(from, to).returns<TrackOverview[]>();

	if (error) {
		return new Response(JSON.stringify({ error: error.message }), { status: 500 });
	}

	setHeaders({
		'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
		'X-Total-Count': String(count ?? 0),
		'X-Page': String(page),
		'X-Limit': String(limit)
	});

	return new Response(
		JSON.stringify({
			page,
			limit,
			total: count ?? 0,
			items: data ?? []
		}),
		{
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		}
	);
};
