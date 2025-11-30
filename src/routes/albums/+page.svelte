<script lang="ts">
	import AlbumCard from '$lib/components/Album/AlbumCard.svelte';
	import { t } from '$lib/i18n/i18n';
	import type { Album } from '$lib/types/albums';

	export let data: { albums: Album[]; error: string | null };

	const { albums = [], error = null } = data;
</script>

<svelte:head>
	<title>{$t('albums.title')}</title>
</svelte:head>

<section class="albums-page">
	<nav class="breadcrumbs" aria-label={$t('albums.title')}>
		<a href="/">{$t('common.home')}</a>
		<span class="breadcrumbs-sep">›</span>
		<span>{$t('albums.title')}</span>
	</nav>

	<header class="albums-heading">
		<h1>{$t('albums.collection_title')}</h1>
	</header>

	{#if error}<p class="error">{error}</p>{/if}

	{#if albums.length === 0}
		<p class="empty">{$t('albums.none')}</p>
	{:else}
		<div class="albums-list">
			{#each albums as album (album.id)}
				<AlbumCard {album} />
			{/each}
		</div>
	{/if}
</section>

<style lang="stylus">
.albums-page
  display flex
  flex-direction column
  gap 1.25rem

.breadcrumbs
  display flex
  align-items center
  gap 0.35rem
  font-size 0.9rem
  color var(--tertiary)
  opacity 0.75

  a
    color inherit
    text-decoration none

.breadcrumbs-sep
  opacity 0.6

.albums-heading
  display flex
  flex-direction column
  gap 0.35rem
  margin 0.25rem 0 0.5rem

  h1
    font-family var(--font-captions)
    font-size 2.1rem
    letter-spacing 0.07em

.albums-list
  display flex
  flex-direction column

.empty, .error
  opacity 0.75
  font-size 0.95rem

.error
  color #dc2626
</style>
