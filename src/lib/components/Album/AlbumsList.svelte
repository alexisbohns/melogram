<script lang="ts">
	import AlbumCard from './AlbumCard.svelte';
	import { t } from '$lib/i18n/i18n';
	import type { Album } from '$lib/types/albums';

	export let albums: Album[] = [];
	export let error: string | null = null;
	export let emptyLabel: string | null = null;
	export let limit: number | null = null;
	export let className = '';

	$: displayedAlbums = typeof limit === 'number' ? albums.slice(0, limit) : albums;
	$: emptyMessage = emptyLabel ?? $t('albums.none');
</script>

<div class={`albums-list-wrapper ${className}`.trim()}>
	{#if error}<p class="error">{error}</p>{/if}

	{#if displayedAlbums.length === 0}
		<p class="empty">{emptyMessage}</p>
	{:else}
		<div class="albums-list">
			{#each displayedAlbums as album (album.id)}
				<AlbumCard {album} />
			{/each}
		</div>
	{/if}
</div>

<style lang="stylus">
.albums-list-wrapper
  display flex
  flex-direction column
  gap 0.5rem

.albums-list
  display flex
  flex-direction column

.empty, .error
  opacity 0.75
  font-size 0.95rem

.error
  color #dc2626
</style>
