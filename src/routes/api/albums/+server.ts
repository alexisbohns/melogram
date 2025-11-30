import type { RequestHandler } from '@sveltejs/kit';

export type AlbumRow = {
	id: string;
	name: string;
	description: string | null;
	type: string;
	cover_url: string | null;
};

const TABLE = 'albums';

export const GET: RequestHandler = async ({ locals, url, setHeaders }) => {
	const supabase = locals.supabase;

	// Query params
	const page = Math.max(parseInt(url.searchParams.get('page') ?? '1', 10), 1);
	const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '20', 10), 1), 100);
	const q = url.searchParams.get('q')?.trim() || '';
	const sort = url.searchParams.get('sort') || 'created_desc';
	// options: created_desc | created_asc | name_asc | name_desc

	const from = (page - 1) * limit;
	const to = from + limit - 1;

	// Base query : on ne sélectionne que les colonnes demandées
	let query = supabase
		.from(TABLE)
		.select('id,name,description,type,cover_url', { count: 'exact' })
		.returns<AlbumRow[]>()
		.range(from, to);

	// Recherche simple sur name + description
	if (q) {
		// @ts-expect-error: .or() est dispo à l'exécution
		query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
	}

	// Tri
	switch (sort) {
		case 'created_asc':
			query = query.order('created_at', { ascending: true });
			break;
		case 'name_asc':
			query = query.order('name', { ascending: true });
			break;
		case 'name_desc':
			query = query.order('name', { ascending: false });
			break;
		case 'created_desc':
		default:
			query = query.order('created_at', { ascending: false });
			break;
	}

	const { data, error, count } = await query;

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
		{ status: 200, headers: { 'Content-Type': 'application/json' } }
	);
};
