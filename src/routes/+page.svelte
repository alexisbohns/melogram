<script lang="ts">
	import Track from '$lib/components/Track/Track.svelte';
	import { t } from '$lib/i18n/i18n';
	import type { TrackOverview } from '$lib/types/tracks';

	export let data;
	const { tracks = [], error = null }: { tracks: TrackOverview[]; error: string | null } = data;

	$: featuredTrack = tracks[0];
	$: otherTracks = tracks.slice(1, 4);
</script>

<svelte:head>
	<title>{$t('tracks.latests')}</title>
</svelte:head>

<section class="latests">
	<div class="latests-heading">
		<div class="latests-badge">BO;NS</div>
		<h1>{$t('tracks.latests')}</h1>
	</div>

	{#if error}<p class="error">{error}</p>{/if}

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
	{/if}
</section>

<style lang="stylus">
.latests
  display flex
  flex-direction column
  gap 1rem

.latests-heading
  display flex
  flex-direction column
  gap 0.35rem
  margin-bottom 0.5rem

.latests-badge
  display inline-flex
  align-items center
  justify-content center
  padding 0.35rem 0.65rem
  background rgba(255,255,255,0.04)
  border 1px solid rgba(255,255,255,0.05)
  border-radius 999px
  font-family var(--font-captions)
  letter-spacing 0.1em
  font-size 0.85rem
  color var(--tertiary)
  width fit-content

h1
  font-family var(--font-captions)
  font-size 1.8rem
  letter-spacing 0.05em

.latests-list
  display flex
  flex-direction column
  gap 1.25rem

.empty, .error
  opacity 0.7
  font-size 0.95rem

.error
  color #dc2626
</style>
