<script lang="ts">
	import PlayerControlButton from '$lib/components/PlayerControlButton.svelte';
	import LikeButton from '$lib/components/LikeButton.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { icons } from '$lib/icons';
	import { t } from '$lib/i18n/i18n';
	import {
		toggle as playerToggle,
		isPlaying as gIsPlaying,
		isReady as gIsReady,
		current as gCurrent,
		setQueue
	} from '$lib/player/player';
	import { createEventDispatcher } from 'svelte';

	export let trackId: string;
	export let trackName: string;
	export let coverUrl: string | null | undefined = undefined;
	export let latestVersionId: string | null = null;
	export let latestResourceUrl: string | null = null;
	export let likeCount: number = 0;
	export let likedByMe: boolean = false;
	export let hasLyrics: boolean = false;

	const dispatch = createEventDispatcher<{ toggleLyrics: void }>();

	$: isPlaying = $gIsPlaying && $gCurrent?.src === latestResourceUrl;

	async function handlePlay() {
		if (!latestResourceUrl || !latestVersionId) return;
		if ($gCurrent?.src !== latestResourceUrl) {
			await setQueue(
				[
					{
						src: latestResourceUrl,
						versionId: latestVersionId,
						title: trackName,
						trackId,
						coverUrl: coverUrl ?? undefined,
						playSource: 'track_page'
					}
				],
				0,
				true
			);
		} else {
			playerToggle();
		}
	}
</script>

<div class="track-header-actions">
	{#if latestResourceUrl}
		<PlayerControlButton
			on:click={handlePlay}
			disabled={!$gIsReady && $gCurrent?.src === latestResourceUrl}
			{isPlaying}
		/>
	{/if}

	<LikeButton {trackId} {likeCount} {likedByMe} />

	{#if hasLyrics}
		<button
			type="button"
			class="lyrics-button"
			on:click={() => dispatch('toggleLyrics')}
			aria-label={$t('common.show_lyrics')}
		>
			<Icon icon={icons.microphone} size={16} label={$t('common.show_lyrics')} />
		</button>
	{/if}
</div>

<style lang="stylus">
.track-header-actions
  display flex
  align-items center
  justify-content center
  gap 1rem

.lyrics-button
  display flex
  align-items center
  justify-content center
  cursor pointer
  opacity 0.5
  mix-blend-mode plus-lighter
  color var(--tertiary)
  transition all ease-out 0.15s
  background none
  border none
  padding 0

  &:hover
    opacity 0.7
    color var(--primary)
    transform scale(110%)

  &:active
    transform scale(90%)
</style>
