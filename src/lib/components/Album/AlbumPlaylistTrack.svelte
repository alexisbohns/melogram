<script lang="ts">
	import PlayerControlButton from '$lib/components/PlayerControlButton.svelte';
	import LikeButton from '$lib/components/LikeButton.svelte';
	import {
		current as gCurrent,
		isPlaying as gIsPlaying,
		isReady as gIsReady,
		load as playerLoad,
		toggle as playerToggle,
		setQueue,
		type PlayerSource
	} from '$lib/player/player';
	import type { TrackOverview } from '$lib/types/tracks';

	export let track: TrackOverview;
	export let playlist: PlayerSource[] | null = null;
	export let playlistIndex: number | null = null;

	$: isPlaying =
		!!track.latest_resource_url && $gIsPlaying && $gCurrent?.src === track.latest_resource_url;

	async function toggle() {
		if (!track.latest_resource_url) return;
		if ($gCurrent?.src !== track.latest_resource_url) {
			const source: PlayerSource = {
				src: track.latest_resource_url,
				versionId: track.latest_version_id ?? undefined,
				title: track.track_name,
				trackId: track.track_id,
				coverUrl: track.album_cover_url ?? undefined
			};
			if (playlist && typeof playlistIndex === 'number' && playlistIndex >= 0) {
				await setQueue(playlist, playlistIndex, true);
			} else {
				await playerLoad(source, true);
			}
		} else {
			playerToggle();
		}
	}
</script>

<div class="album-playlist-track" class:upcoming={!track.latest_version_id}>
	{#if track.latest_resource_url}
		<PlayerControlButton
			on:click={toggle}
			disabled={!$gIsReady && $gCurrent?.src === track.latest_resource_url}
			{isPlaying}
		/>
	{:else}
		<PlayerControlButton upcoming />
	{/if}

	<div class="track-info">
		<a class="track-name" href={`/tracks/${track.track_id}`}>{track.track_name}</a>
	</div>

	{#if track.latest_version_id}
		<LikeButton
			trackId={track.track_id}
			likeCount={track.like_count}
			likedByMe={track.liked_by_me}
		/>
	{/if}
</div>

<style lang="stylus">
.album-playlist-track
  display flex
  align-items center
  gap 0.75rem
  padding 0.4rem 0

  &.upcoming
    opacity 0.5

.track-info
  flex 1
  min-width 0

.track-name
  font-family var(--font-captions)
  font-size 0.95rem
  letter-spacing 0.03em
  color inherit
  text-decoration none
  word-break break-word
  transition opacity 0.15s ease-out

  &:hover
    opacity 0.8
</style>
