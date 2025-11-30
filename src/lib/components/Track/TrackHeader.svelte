<script lang="ts">
	import PlayerControlButton from '$lib/components/PlayerControlButton.svelte';
	import {
		current as gCurrent,
		isPlaying as gIsPlaying,
		isReady as gIsReady,
		load as playerLoad,
		toggle as playerToggle
	} from '$lib/player/player';
	import Cover from './Cover.svelte';

	export let trackName: string;
	export let albumName: string | null = null;
	export let albumId: string | null = null;
	export let coverUrl: string | null = null;
	export let coverDisplay: 'none' | 'default' | 'large' = 'default';
	export let latestResourceUrl: string | null = null;
	export let latestVersionId: string | null = null;
	export let showAlbumName = true;

	let isReady = false;
	let isPlaying = false;

	$: isReady = $gIsReady;
	$: isPlaying = !!latestResourceUrl && $gIsPlaying && $gCurrent?.src === latestResourceUrl;

	async function toggle() {
		if (!latestResourceUrl) return;
		if ($gCurrent?.src !== latestResourceUrl) {
			await playerLoad(
				{
					src: latestResourceUrl,
					versionId: latestVersionId ?? undefined,
					title: trackName,
					trackSlug: undefined,
					coverUrl: coverUrl ?? undefined
				},
				true
			);
		} else {
			playerToggle();
		}
	}
</script>

<header class={`track-header ${coverDisplay === 'large' ? 'track-header-featured' : ''}`}>
	<div class="track-header-main">
		<Cover cover_url={coverUrl} alt={trackName} display={coverDisplay} />
		<div class="track-header-text">
			<div class="track-title">{trackName}</div>
			{#if albumName && showAlbumName}
				{#if albumId}
					<a class="track-album track-album-link" href={`/albums/${albumId}`}>
						{albumName}
					</a>
				{:else}
					<div class="track-album">{albumName}</div>
				{/if}
			{/if}
		</div>
	</div>
	{#if latestResourceUrl}
		<PlayerControlButton
			on:click={toggle}
			disabled={!isReady && $gCurrent?.src === latestResourceUrl}
			{isPlaying}
		/>
	{/if}
</header>

<style lang="stylus">
.track-header
  display flex
  align-items center
  justify-content space-between
  gap 0.75rem

  &-main
    display flex
    align-items center
    gap 0.75rem
    min-width 0

  &-text
    display flex
    flex-direction column
    gap 0.125rem
    min-width 0

  .track-title
    font-family var(--font-captions)
    font-size 1.1rem
    letter-spacing 0.04em
    text-transform none
    line-height 1.25
    word-break break-word

  .track-album
    color var(--tertiary)
    opacity 0.6
    font-size 0.9rem
    line-height 1.2
    word-break break-word

  .track-album-link
    text-decoration none
    transition opacity 0.15s ease-out

    &:hover
      opacity 0.9

.track-header-featured
  .track-title
    font-size 1.25rem

  .track-album
    font-size 1.05rem
</style>
