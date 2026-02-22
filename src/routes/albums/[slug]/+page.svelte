<script lang="ts">
	import { t } from '$lib/i18n/i18n';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import type { Album } from '$lib/types/albums';
	import type { TrackOverview } from '$lib/types/tracks';
	import AlbumPlaylist from '$lib/components/Album/AlbumPlaylist.svelte';

	export let data: {
		album: Album | null;
		tracks: TrackOverview[];
		error: string | null;
		tracksError: string | null;
	};

	const { album, tracks = [], error, tracksError } = data;

	$: crumbs = [
		{ label: $t('common.home'), href: '/' },
		{ label: $t('albums.title'), href: '/albums' },
		...(album ? [{ label: album.name }] : [])
	];
</script>

<svelte:head>
	<title>{album ? album.name : $t('albums.title')}</title>
</svelte:head>

{#if error}
	<p class="error">{error}</p>
{:else if !album}
	<p class="empty">{$t('albums.not_found')}</p>
{:else}
	<section class="album-page">
		<Breadcrumbs items={crumbs} ariaLabel={$t('albums.title')} />

		{#if tracksError}
			<p class="error">{tracksError}</p>
		{/if}

		<AlbumPlaylist {album} {tracks} />
	</section>
{/if}

<style lang="stylus">
	.album-page
		display flex
		flex-direction column
		gap 2rem

	.empty, .error
		opacity 0.75
		font-size 0.95rem
	.error
		color #dc2626
</style>
