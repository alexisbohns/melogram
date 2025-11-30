<script lang="ts">
	import { t } from '$lib/i18n/i18n';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import type { Album } from '$lib/types/albums';
	import type { TrackOverview } from '$lib/types/tracks';
	import Track from '$lib/components/Track/Track.svelte';
	import SectionHeading from '$lib/components/SectionHeading.svelte';

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

	$: availableTracks = tracks.filter((t) => Boolean(t.latest_version_id));
	$: upcomingTracks = tracks.filter((t) => !t.latest_version_id);
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

		<section class="album-hero">
			<header class="album-header">
				<h1>{album.name}</h1>
				{#if album.description}
					<p class="album-description">{album.description}</p>
				{/if}
			</header>

			{#if album.cover_url}
				<div class="album-cover">
					<img src={album.cover_url} alt={album.name} loading="lazy" />
				</div>
			{/if}
		</section>

		<section class="album-tracks">
			{#if tracksError}
				<p class="error">{tracksError}</p>
			{:else if tracks.length === 0}
				<p class="empty">{$t('tracks.none')}</p>
			{:else}
				{#if availableTracks.length > 0}
					<section class="album-tracks-section">
						<SectionHeading>{$t('tracks.available')}</SectionHeading>
						<div class="album-tracks-list">
							{#each availableTracks as track (track.track_id)}
								<Track {track} variant="album" />
							{/each}
						</div>
					</section>
				{/if}

				{#if upcomingTracks.length > 0}
					<section class="album-tracks-section album-tracks-upcoming">
						<SectionHeading>{$t('tracks.upcoming')}</SectionHeading>
						<div class="album-tracks-list">
							{#each upcomingTracks as track (track.track_id)}
								<Track {track} variant="album" muted />
							{/each}
						</div>
					</section>
				{/if}

				{#if availableTracks.length === 0 && upcomingTracks.length === 0}
					<p class="empty">{$t('tracks.none')}</p>
				{/if}
			{/if}
		</section>
	</section>
{/if}

<style lang="stylus">
	.album-page
		display flex
		flex-direction column
		gap 2rem

	.album-hero
		display flex
		flex-direction column
		gap 1rem

	.album-header
		display flex
		flex-direction column
		gap 0.5rem

	h1
		font-family var(--font-captions)
		font-size 2.4rem
		letter-spacing 0.07em
		line-height 1.2

	.album-description
		color var(--tertiary)
		opacity 0.9
		font-size 1.1rem
		line-height 1.6

	.album-cover
		align-self center
		width 100%
		max-width 520px
		border-radius 1.25rem
		overflow hidden
		background rgba(255,255,255,0.03)

	img
		width 100%
		height auto
		display block
		box-shadow 0 22px 70px rgba(0,0,0,0.38)

	.album-tracks
		display flex
		flex-direction column
		gap 3rem

	.album-tracks-section
		display flex
		flex-direction column
		gap 2rem

	.album-tracks-list
		display flex
		flex-direction column
		gap 0.5rem

	.empty, .error
		opacity 0.75
		font-size 0.95rem
	.error
		color #dc2626
</style>
