import { createServerClient } from '@supabase/auth-helpers-sveltekit';
import type { CookieOptions } from '@supabase/auth-helpers-sveltekit';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

const supabaseHandle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(
		process.env.PUBLIC_SUPABASE_URL!,
		process.env.PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				get: (key: string) => event.cookies.get(key),
				set: (key: string, value: string, options: CookieOptions = {}) => {
					event.cookies.set(key, value, { ...options, path: '/' });
				},
				remove: (key: string, options: CookieOptions = {}) => {
					event.cookies.delete(key, { ...options, path: '/' });
				}
			}
		}
	);

	const {
		data: { user }
	} = await event.locals.supabase.auth.getUser();
	event.locals.user = user ?? null;

	return resolve(event);
};

export const handle = sequence(supabaseHandle);
