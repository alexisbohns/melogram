<script lang="ts">
	import { t } from '$lib/i18n/i18n';
	import type { Album } from '$lib/types/albums';

	export let data: { album: Album | null; error: string | null };

	const { album, error } = data;
</script>

<svelte:head>
	<title>{album ? album.name : $t('albums.title')}</title>
</svelte:head>

{#if error}
	<p class="error">{error}</p>
{:else if !album}
	<p class="empty">{$t('albums.not_found')}</p>
{:else}
	<section class="album-page">
		<nav class="breadcrumbs" aria-label={$t('albums.title')}>
			<a href="/">{$t('common.home')}</a>
			<span class="breadcrumbs-sep">›</span>
			<a href="/albums">{$t('albums.title')}</a>
			<span class="breadcrumbs-sep">›</span>
			<span>{album.name}</span>
		</nav>

		<header class="album-header">
			<h1>{album.name}</h1>
			{#if album.description}
				<p class="album-description">{album.description}</p>
			{/if}
		</header>

		{#if album.cover_url}
			<div class="album-cover">
				<img src={album.cover_url} alt={album.name} loading="lazy" />
			</div>
		{/if}
	</section>
{/if}

<style lang="stylus">
.album-page
  display flex
  flex-direction column
  gap 1.5rem

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

.album-header
  display flex
  flex-direction column
  gap 0.4rem

  h1
    font-family var(--font-captions)
    font-size 2.2rem
    letter-spacing 0.07em
    line-height 1.2

.album-description
  color var(--tertiary)
  opacity 0.85
  font-size 1.05rem
  line-height 1.55

.album-cover
  align-self center
  width 100%
  max-width 400px

  img
    width 100%
    height auto
    display block
    border-radius 1rem
    box-shadow 0 18px 60px rgba(0,0,0,0.35)

.empty, .error
  opacity 0.75
  font-size 0.95rem

.error
  color #dc2626
</style>
