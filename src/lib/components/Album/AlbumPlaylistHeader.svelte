<script lang="ts">
	import Cover from '$lib/components/Track/Cover.svelte';
	import PlayerControlButton from '$lib/components/PlayerControlButton.svelte';
	import type { Album } from '$lib/types/albums';
	import {
		current as gCurrent,
		isPlaying as gIsPlaying,
		isReady as gIsReady,
		toggle as playerToggle,
		setQueue,
		type PlayerSource
	} from '$lib/player/player';

	export let album: Album;
	export let playlist: PlayerSource[] = [];

	$: albumSrcs = new Set(playlist.map((p) => p.src));
	$: isCurrentAlbumTrack = !!$gCurrent && albumSrcs.has($gCurrent.src);
	$: isAlbumPlaying = $gIsPlaying && isCurrentAlbumTrack;

	async function playAlbum() {
		if (playlist.length === 0) return;
		if (isCurrentAlbumTrack) {
			playerToggle();
		} else {
			await setQueue(playlist, 0, true);
		}
	}
</script>

<header class="album-playlist-header">
	<Cover cover_url={album.cover_url} alt={album.name} display="large" />

	<div class="album-header-body">
		<a class="album-header-name" href={`/albums/${album.id}`}>{album.name}</a>
		{#if album.description}
			<p class="album-header-description">{album.description}</p>
		{/if}
	</div>

	{#if playlist.length > 0}
		<PlayerControlButton
			on:click={playAlbum}
			disabled={!$gIsReady && isCurrentAlbumTrack}
			isPlaying={isAlbumPlaying}
		/>
	{/if}
</header>

<style lang="stylus">
.album-playlist-header
  display flex
  align-items center
  gap 1rem

.album-header-body
  flex 1
  display flex
  flex-direction column
  gap 0.35rem
  min-width 0

.album-header-name
  font-family var(--font-captions)
  font-size 1.1rem
  letter-spacing 0.05em
  line-height 1.2
  margin 0
  word-break break-word
  color inherit
  text-decoration none
  transition opacity 0.15s ease-out

  &:hover
    opacity 0.8

.album-header-description
  margin 0
  color var(--tertiary)
  opacity 0.85
  line-height 1.45
  font-size 0.8rem
  word-break break-word
</style>
