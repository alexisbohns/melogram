<script lang="ts">
	import AlbumsList from '$lib/components/Album/AlbumsList.svelte';
	import Track from '$lib/components/Track/Track.svelte';
	import { t } from '$lib/i18n/i18n';
	import type { Album } from '$lib/types/albums';
	import type { TrackOverview } from '$lib/types/tracks';
	import SectionHeading from '$lib/components/SectionHeading.svelte';

	export let data;
	const {
		tracks = [],
		tracksError = null,
		albums = [],
		albumsError = null
	}: {
		tracks: TrackOverview[];
		tracksError: string | null;
		albums: Album[];
		albumsError: string | null;
	} = data;

	$: featuredTrack = tracks[0];
	$: otherTracks = tracks.slice(1, 4);
</script>

<svelte:head>
	<title>{$t('tracks.latests')}</title>
</svelte:head>

<section class="home-page">
	<section class="latests">
		<SectionHeading>{$t('tracks.latests')}</SectionHeading>

		{#if tracksError}<p class="error">{tracksError}</p>{/if}

		{#if tracks.length === 0}
			<p class="empty">{$t('tracks.none')}</p>
		{:else}
			{#if featuredTrack}
				<Track track={featuredTrack} variant="featured" />
			{/if}
			<div class="latests-list">
				{#each otherTracks as track (track.track_id)}
					<Track {track} variant="compact" />
				{/each}
			</div>

			<a class="tracks-cta" href="/tracks">{$t('tracks.see_all')}</a>
		{/if}
	</section>

	<section class="collections">
		<SectionHeading>{$t('albums.collection_title')}</SectionHeading>

		<AlbumsList {albums} error={albumsError} />
	</section>
</section>

<style lang="stylus">
.home-page
  display flex
  flex-direction column
  gap 2.5rem

.latests
  display flex
  flex-direction column
  gap 1.1rem

.latests-list
  display flex
  flex-direction column
  gap 1.25rem

.tracks-cta
  display flex
  justify-content center
  align-items center
  padding 0.95rem 1.1rem
  border-radius 0.5rem
  mix-blend-mode plus-lighter
  border 1px solid var(--tertiary)
  color var(--tertiary)
  font-family var(--font-captions)
  letter-spacing 0.08em
  opacity 0.8
  text-transform uppercase
  transition background 0.2s ease-out, transform 0.2s ease-out

  &:hover
    background rgba(255,255,255,0.05)
    transform translateY(1px)

.collections
  display flex
  flex-direction column
  gap 1rem

.empty, .error
  opacity 0.7
  font-size 0.95rem

.error
  color #dc2626
</style>
