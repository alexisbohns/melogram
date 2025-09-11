import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import sveltePreprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
    preprocess: [vitePreprocess(), sveltePreprocess({ stylus: true }), mdsvex()],
	kit: { adapter: adapter() },
	extensions: ['.svelte', '.svx']
};

export default config;
