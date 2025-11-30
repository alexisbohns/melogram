<script lang="ts">
	import TrackItemBody from './TrackItemBody.svelte';
	import TrackFooter from './TrackFooter.svelte';
	import TrackHeader from './TrackHeader.svelte';
	import type { TrackOverview } from '$lib/types/tracks';
	import type { PlayerSource } from '$lib/player/player';

	export let track: TrackOverview;
	export let variant: 'featured' | 'compact' | 'album' = 'compact';
	export let muted = false;
	export let playlist: PlayerSource[] | null = null;
	export let playlistIndex: number | null = null;

	let coverDisplay: 'none' | 'default' | 'large';
	let showAlbumName: boolean;
	let hasVersion = false;

	$: coverDisplay = variant === 'featured' ? 'large' : 'default';
	$: showDescription = variant === 'featured' || variant === 'album';
	$: showAlbumName = variant !== 'album';
	$: hasVersion = Boolean(track.latest_version_id);
</script>

<article class={`track track-${variant}${muted ? ' track-muted' : ''}`}>
	<TrackHeader
		trackName={track.track_name}
		trackId={track.track_id}
		albumName={track.album_name}
		albumId={track.album_id}
		coverUrl={track.album_cover_url}
		{coverDisplay}
		{showAlbumName}
		latestResourceUrl={track.latest_resource_url}
		latestVersionId={track.latest_version_id}
		{playlist}
		{playlistIndex}
	/>

	<TrackItemBody description={track.track_description} display={showDescription} />

	{#if hasVersion}
		<TrackFooter
			track_id={track.track_id}
			latest_status={track.latest_status}
			latest_release_date={track.latest_release_date}
		/>
	{/if}
</article>

<style lang="stylus">
.track
  display flex
  flex-direction column
  gap 0.5rem
  padding 1rem 0

  &:last-child
    border-bottom none

.track-featured
  gap 0.75rem
  padding 1.25rem 0 1.5rem

.track-compact
  padding 0.75rem 0

.track-album
  gap 0.75rem
  padding 1rem 0 1.25rem

  :global(.track-header)
    align-items flex-start

.track-muted
  opacity 0.6
</style>
