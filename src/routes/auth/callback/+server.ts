import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	const code = url.searchParams.get('code');

	if (code) {
		const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
		if (error) {
			console.error('Supabase OAuth callback failed', error);
		}
	}

	throw redirect(303, '/');
};
