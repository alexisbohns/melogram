<script lang="ts">
	import TrackItemBody from './TrackItemBody.svelte';
	import TrackFooter from './TrackFooter.svelte';
	import TrackHeader from './TrackHeader.svelte';
	import type { TrackOverview } from '$lib/types/tracks';

	export let track: TrackOverview;
	export let variant: 'featured' | 'compact' = 'compact';

	let coverDisplay: 'none' | 'default' | 'large';
	$: coverDisplay = variant === 'featured' ? 'large' : 'default';
	$: showDescription = variant === 'featured';
</script>

<article class={`track track-${variant}`}>
	<TrackHeader
		trackName={track.track_name}
		albumName={track.album_name}
		albumId={track.album_id}
		coverUrl={track.album_cover_url}
		{coverDisplay}
		latestResourceUrl={track.latest_resource_url}
		latestVersionId={track.latest_version_id}
	/>

	<TrackItemBody description={track.track_description} display={showDescription} />

	<TrackFooter
		track_id={track.track_id}
		latest_status={track.latest_status}
		latest_release_date={track.latest_release_date}
	/>
</article>

<style lang="stylus">
.track
  display flex
  flex-direction column
  gap 0.5rem
  padding 1rem 0
  border-bottom 1px solid rgba(255,255,255,0.04)

  &:last-child
    border-bottom none

.track-featured
  gap 0.75rem
  padding 1.25rem 0 1.5rem

.track-compact
  padding 0.75rem 0
</style>
