import { env } from '$env/dynamic/private';
import { createServerClient } from '@supabase/auth-helpers-sveltekit';
import type { CookieOptions } from '@supabase/auth-helpers-sveltekit';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

const supabaseHandle: Handle = async ({ event, resolve }) => {
  const supabaseUrl = env.PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
  const supabaseAnonKey = env.PUBLIC_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase credentials are missing (PUBLIC_SUPABASE_URL/PUBLIC_SUPABASE_ANON_KEY)');
    return new Response('Supabase is not configured', { status: 500 });
  }

  event.locals.supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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
