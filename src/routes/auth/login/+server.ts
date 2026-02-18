import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	const { data, error: signInError } = await locals.supabase.auth.signInWithOAuth({
		provider: 'google',
		options: {
			redirectTo: `${url.origin}/auth/callback`
		}
	});

	if (signInError || !data?.url) {
		console.error('Supabase OAuth sign-in failed', signInError);
		throw error(500, 'Unable to start Google sign-in');
	}

	throw redirect(303, data.url);
};
